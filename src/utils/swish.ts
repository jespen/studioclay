import { SwishPaymentParams, SwishPaymentResult, SwishStatusResult, SwishPaymentStatus } from '../types/payment';

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
 * Creates a Swish payment request
 * In test mode, simulates the Swish test environment response
 * In production, makes a real request to Swish's API
 */
export async function createSwishPayment(params: SwishPaymentParams): Promise<SwishPaymentResult> {
  console.log('Creating Swish payment request:', params);
  
  if (isTestMode()) {
    console.log('Using Swish test environment');
    
    // In test mode, generate a test payment ID
    const testId = `${params.phoneNumber}-${Date.now()}`;
    console.log('Generated test payment ID:', testId);
    
    // Store the callback URL for this payment
    testPaymentCallbacks[testId] = {
      reference: params.paymentReference,
      callbackUrl: params.callbackUrl,
      status: 'CREATED'
    };
    
    console.log('Stored callback information for test payment:', testId);
    
    // In real Swish test environment:
    // 1. This would return a location header with the payment ID
    // 2. Swish would process the payment based on test phone number
    // 3. Swish would send a callback to our callback URL
    
    return {
      success: true,
      paymentId: testId
    };
  }
  
  // Production Swish implementation
  try {
    const swishRequest: SwishPaymentRequest = {
      payeePaymentReference: params.paymentReference,
      callbackUrl: params.callbackUrl,
      payeeAlias: process.env.SWISH_PAYEE_ALIAS || '',
      amount: params.amount.toString(),
      currency: 'SEK',
      message: params.message,
      phoneNumber: params.phoneNumber
    };

    // TODO: Implement production Swish API call
    // This would:
    // 1. Use certificates for authentication
    // 2. Make HTTPS request to Swish API
    // 3. Handle the response
    throw new Error('Production Swish implementation not yet available');
  } catch (error) {
    console.error('Error creating Swish payment:', error);
    return {
      success: false,
      error: 'Failed to create Swish payment'
    };
  }
}

/**
 * Trigger a callback to simulate Swish's callback mechanism
 * Includes retry mechanism for reliability
 */
async function triggerCallback(paymentId: string, status: string, forceTrigger = false, maxRetries = 3) {
  if (!testPaymentCallbacks[paymentId]) {
    console.error('No callback information found for payment:', paymentId);
    return;
  }
  
  const { reference, callbackUrl } = testPaymentCallbacks[paymentId];
  console.log('Triggering callback for test payment:', {
    paymentId,
    reference,
    status,
    callbackUrl,
    forceTrigger
  });
  
  // Only trigger the callback if the status has changed or force trigger is true
  if (!forceTrigger && testPaymentCallbacks[paymentId].status === status) {
    console.log('Status unchanged and not forced, skipping callback', { 
      current: testPaymentCallbacks[paymentId].status, 
      new: status 
    });
    return;
  }
  
  // Create callback payload matching Swish's format
  const callbackBody = JSON.stringify({
    payeePaymentReference: reference,
    status
  });
  
  console.log('Callback request body:', callbackBody);
  
  let success = false;
  let retryCount = 0;
  let lastError = null;
  
  while (!success && retryCount < maxRetries) {
    try {
      console.log(`Attempt ${retryCount + 1}/${maxRetries} to send callback to ${callbackUrl}`);
      
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: callbackBody
      });
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('Callback successfully triggered for test payment:', paymentId);
        console.log('Callback response:', responseText);
        testPaymentCallbacks[paymentId].status = status;
        success = true;
        break;
      } else {
        const errorText = await response.text();
        console.error(`Callback failed (${response.status}):`, errorText);
        lastError = new Error(`HTTP error ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error(`Callback attempt ${retryCount + 1} failed with error:`, error);
      lastError = error;
    }
    
    retryCount++;
    if (retryCount < maxRetries) {
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, retryCount) * 500;
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  if (!success) {
    console.error(`All ${maxRetries} callback attempts failed:`, lastError);
  } else {
    console.log('Callback successfully delivered after', retryCount > 0 ? `${retryCount + 1} attempts` : '1 attempt');
  }
}

/**
 * Checks the status of a Swish payment
 * In test mode, simulates the Swish test environment behavior based on test phone numbers:
 * - 071234567 → PAID
 * - 071234568 → DECLINED
 * - 071234569 → ERROR
 * - Any other number → CREATED
 */
export async function checkSwishPaymentStatus(paymentId: string): Promise<SwishStatusResult> {
  if (isTestMode()) {
    console.log('Using Swish test environment for status check for paymentId:', paymentId);
    
    // In test mode, simulate Swish's test environment behavior
    // Status is determined by the phone number in the payment ID
    const phoneNumber = paymentId.split('-')[0];
    let status: SwishPaymentStatus;
    
    console.log('Test phone number detected:', phoneNumber);
    
    switch (phoneNumber) {
      case '071234567':
        status = 'PAID';
        console.log('Test phone number 071234567 detected, returning PAID status');
        
        // Always trigger callback for test success phone to ensure booking is created
        console.log('Forcing callback trigger for test success phone');
        await triggerCallback(paymentId, status, true); // Force trigger
        break;
      case '071234568':
        status = 'DECLINED';
        console.log('Test phone number 071234568 detected, returning DECLINED status');
        break;
      case '071234569':
        status = 'ERROR';
        console.log('Test phone number 071234569 detected, returning ERROR status');
        break;
      default:
        status = 'CREATED';
        console.log('Unknown test phone number, returning CREATED status');
    }
    
    return {
      success: true,
      status
    };
  }
  
  // Production Swish implementation
  try {
    // TODO: Implement production status check
    // This would:
    // 1. Use certificates for authentication
    // 2. Make HTTPS request to Swish API
    // 3. Parse and return the status
    throw new Error('Production Swish implementation not yet available');
  } catch (error) {
    console.error('Error checking Swish payment status:', error);
    return {
      success: false,
      status: 'ERROR',
      error: 'Failed to check payment status'
    };
  }
} 