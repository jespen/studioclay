import { SwishPaymentParams, SwishPaymentResult, SwishStatusResult } from '../types/payment';
import { swishConfig } from '../config/swish';
import https from 'https';
import fs from 'fs';

// Types for Swish API
interface SwishPaymentRequest {
  payeePaymentReference: string;
  callbackUrl: string;
  payeeAlias: string;
  amount: string;
  currency: string;
  message: string;
  phoneNumber: string;
}

// Store callback URLs for test payments in a global variable (persists between module loads)
// @ts-ignore: Global variable declaration
let globalTestPaymentCallbacks: Record<string, { reference: string, callbackUrl: string, status: string }> = 
  // @ts-ignore: Accessing global variable
  global.testPaymentCallbacks || {};

// Save it back to the global object for persistence
// @ts-ignore: Assigning to global variable
if (typeof global !== 'undefined') global.testPaymentCallbacks = globalTestPaymentCallbacks;

// Make a local reference for easier access
const testPaymentCallbacks = globalTestPaymentCallbacks;

// Check if we're in test mode
function isTestMode() {
  return process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
}

/**
 * Makes an HTTPS request with certificates
 */
function makeHttpsRequest(url: string, options: https.RequestOptions, data?: any): Promise<{ statusCode: number, headers: any, data: any }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        let parsedData;
        try {
          parsedData = responseData ? JSON.parse(responseData) : null;
        } catch (e) {
          parsedData = null;
        }
        resolve({
          statusCode: res.statusCode || 500,
          headers: res.headers,
          data: parsedData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Creates a Swish payment request
 * Uses the Swish MSS (Merchant Swish Simulator) in test mode
 * Uses the production Swish API in production mode
 */
export async function createSwishPayment(params: SwishPaymentParams): Promise<SwishPaymentResult> {
  console.log('Creating Swish payment request:', params);
  
  // First create a payment record in our database
  try {
    const paymentResponse = await fetch('/api/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_info: {
          firstName: params.userInfo.firstName,
          lastName: params.userInfo.lastName,
          email: params.userInfo.email,
          phone: params.userInfo.phone
        },
        product_type: 'course',
        product_id: params.courseId,
        amount: params.amount,
        quantity: parseInt(params.userInfo.numberOfParticipants),
        payment_method: 'swish'
      })
    });

    const paymentData = await paymentResponse.json();
    if (!paymentData.success) {
      throw new Error('Failed to create payment record');
    }

    const paymentId = paymentData.paymentId;
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/swish/callback`;

    // Now create the Swish payment request
    const baseUrl = isTestMode() ? swishConfig.testApiUrl : swishConfig.productionApiUrl;
    const url = `${baseUrl}${swishConfig.endpoints.createPayment}`;
    
    const swishRequest = {
      payeePaymentReference: paymentId,
      callbackUrl: callbackUrl,
      payeeAlias: isTestMode() ? process.env.SWISH_TEST_PAYEE_ALIAS! : process.env.SWISH_PROD_PAYEE_ALIAS!,
      amount: params.amount.toString(),
      currency: 'SEK',
      message: `Betalning för ${params.courseId}`,
      phoneNumber: params.phoneNumber
    };

    // Load certificates
    const certPath = isTestMode() ? process.env.SWISH_TEST_CERT_PATH : process.env.SWISH_PROD_CERT_PATH;
    const keyPath = isTestMode() ? process.env.SWISH_TEST_KEY_PATH : process.env.SWISH_PROD_KEY_PATH;
    const caPath = isTestMode() ? process.env.SWISH_TEST_CA_PATH : process.env.SWISH_PROD_CA_PATH;

    if (!certPath || !keyPath || !caPath) {
      throw new Error('Missing certificate configuration');
    }

    const options: https.RequestOptions = {
      method: 'POST',
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      ca: fs.readFileSync(caPath),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await makeHttpsRequest(url, options, swishRequest);

    if (response.statusCode !== 201) {
      throw new Error(`HTTP error! status: ${response.statusCode}`);
    }

    // Get payment reference from Location header
    const location = response.headers['location'];
    const swishReference = location?.split('/').pop();

    if (!swishReference) {
      throw new Error('No payment reference received from Swish');
    }

    // Update our payment record with Swish reference
    await fetch('/api/payments/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentId,
        swishReference,
        status: 'PENDING'
      })
    });

    return {
      success: true,
      paymentId: swishReference
    };
  } catch (error) {
    console.error('Error creating Swish payment:', error);
    return {
      success: false,
      error: 'Failed to create Swish payment'
    };
  }
}

/**
 * Checks the status of a Swish payment
 */
export async function checkSwishPaymentStatus(paymentId: string): Promise<SwishStatusResult> {
  const baseUrl = isTestMode() ? swishConfig.testApiUrl : swishConfig.productionApiUrl;
  const url = `${baseUrl}${swishConfig.endpoints.getPayment}/${paymentId}`;

  try {
    // Load certificates
    const certPath = isTestMode() ? process.env.SWISH_TEST_CERT_PATH : process.env.SWISH_PROD_CERT_PATH;
    const keyPath = isTestMode() ? process.env.SWISH_TEST_KEY_PATH : process.env.SWISH_PROD_KEY_PATH;
    const caPath = isTestMode() ? process.env.SWISH_TEST_CA_PATH : process.env.SWISH_PROD_CA_PATH;

    if (!certPath || !keyPath || !caPath) {
      throw new Error('Missing certificate configuration');
    }

    const options: https.RequestOptions = {
      method: 'GET',
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      ca: fs.readFileSync(caPath),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await makeHttpsRequest(url, options);

    if (response.statusCode !== 200) {
      throw new Error(`HTTP error! status: ${response.statusCode}`);
    }

    // Get our payment record status
    const paymentResponse = await fetch(`/api/payments/status/${paymentId}`);
    const paymentData = await paymentResponse.json();

    return {
      success: true,
      status: paymentData.status,
      bookingReference: paymentData.bookingReference
    };
  } catch (error) {
    console.error('Error checking Swish payment status:', error);
    return {
      success: false,
      status: 'ERROR',
      error: 'Failed to check payment status'
    };
  }
} 