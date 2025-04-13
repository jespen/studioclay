import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logDebug, logError, logInfo } from '@/lib/logging';
import https from 'https';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { SwishService } from '@/services/swish/swishService';
import { SwishPaymentData, SwishRequestSchema } from '@/services/swish/types';
import { setupCertificate } from '../cert-helper';
import { PAYMENT_STATUSES, getValidPaymentStatus } from '@/constants/statusCodes';
import { generatePaymentReference, generateOrderReference } from '@/utils/referenceGenerators';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define metadata interface
interface PaymentMetadata {
  idempotency_key: string | null;
  item_details?: {
    type: string;
    recipientName: string;
    recipientEmail: string;
    message: string;
  };
  [key: string]: any;
}

// Schema för validering av Swish-betalningsdata
const SwishPaymentSchema = z.object({
  phone_number: z.string().min(1),
  payment_method: z.literal('swish'),
  product_type: z.enum(['course', 'gift_card', 'art_product']),
  product_id: z.string(),
  amount: z.number(),
  quantity: z.number(),
  user_info: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    numberOfParticipants: z.string().transform(val => Number(val) || 1),
    // Optional fields for invoice payments
    address: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional()
  })
});

// Hjälpfunktion för att kontrollera idempotency
async function checkIdempotency(idempotencyKey: string) {
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('*')
    .eq('metadata->idempotency_key', idempotencyKey)
    .single();

  return existingPayment;
}

// Helper function to make HTTPS request with certificates
async function makeSwishRequest(data: any): Promise<{ success: boolean, data?: any, error?: string }> {
  try {
    const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    
    // Get base URL from environment, with fallbacks
    const baseUrl = isTestMode 
      ? (process.env.SWISH_TEST_API_URL || 'https://mss.cpc.getswish.net/swish-cpcapi/api/v1')
      : (process.env.SWISH_PROD_API_URL || 'https://cpc.getswish.net/swish-cpcapi/api/v1');
    
    // Use full URL if provided, otherwise construct it
    const url = baseUrl.includes('/paymentrequests') ? baseUrl : `${baseUrl}/paymentrequests`;

    // Log the full URL being used
    logDebug('Using Swish API URL:', url);
    logDebug('isTestMode:', isTestMode);

    // Load certificates
    const certPath = isTestMode ? process.env.SWISH_TEST_CERT_PATH! : process.env.SWISH_PROD_CERT_PATH!;
    const keyPath = isTestMode ? process.env.SWISH_TEST_KEY_PATH! : process.env.SWISH_PROD_KEY_PATH!;
    const caPath = isTestMode ? process.env.SWISH_TEST_CA_PATH! : process.env.SWISH_PROD_CA_PATH!;

    // Log certificate paths and check if they exist
    const resolvedCertPath = path.resolve(process.cwd(), certPath);
    const resolvedKeyPath = path.resolve(process.cwd(), keyPath);
    const resolvedCaPath = path.resolve(process.cwd(), caPath);
    
    logDebug('Certificate paths:', {
      certPath: resolvedCertPath,
      keyPath: resolvedKeyPath,
      caPath: resolvedCaPath,
      certExists: fs.existsSync(resolvedCertPath),
      keyExists: fs.existsSync(resolvedKeyPath),
      caExists: fs.existsSync(resolvedCaPath)
    });

    // Create HTTPS agent with certificates
    const agent = new https.Agent({
      cert: fs.readFileSync(resolvedCertPath),
      key: fs.readFileSync(resolvedKeyPath),
      ca: fs.readFileSync(resolvedCaPath),
      minVersion: 'TLSv1.2'
    });

    // Log request data (with sensitive information redacted)
    const logData = { ...data };
    if (logData.payerAlias) {
      logData.payerAlias = logData.payerAlias.substring(0, 4) + '****' + logData.payerAlias.slice(-2);
    }
    logDebug('Sending request to Swish:', { url, data: logData });

    // Make the request using node-fetch
    const response = await fetch(url, {
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    // Handle response
    if (response.status === 201) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('No Location header in response');
      }
      const reference = location.split('/').pop();
      logDebug('Successfully created payment request, reference:', reference);
      return { success: true, data: { reference } };
    }

    // If not 201, try to get error details
    const responseText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = responseText;
    }

    logDebug('Swish API error response:', {
      status: response.status,
      statusText: response.statusText,
      data: errorData
    });

    return {
      success: false,
      error: `Swish API error: ${response.status} ${response.statusText}`,
      data: errorData
    };
  } catch (error) {
    logDebug('Error in makeSwishRequest:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Förbered meddelandet baserat på produkttyp
async function getProductTitle(productType: string, productId: string) {
  try {
    switch(productType) {
      case 'course':
        // Hämta kurstitel från databasen
        const { data: course, error: courseError } = await supabase
          .from('course_instances')
          .select('*, course_templates:template_id(*)')
          .eq('id', productId)
          .single();
        
        if (courseError || !course) {
          logError('Error fetching course title:', courseError);
          return 'Kurs';
        }

        // Använd kursinstansens titel om den finns, annars template-titeln
        const courseTitle = course.title || 
                          (course.course_templates?.name) || 
                          'Kurs';
        return courseTitle;
        
      case 'gift_card':
        return 'Presentkort';
        
      case 'art_product':
        // Hämta produkttitel från products-tabellen (inte shop_items)
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('title')
          .eq('id', productId)
          .single();
        
        if (productError || !product) {
          logError('Error fetching product title:', productError);
          return 'Produkt';
        }
        
        return product.title || 'Produkt';
        
      default:
        return 'Betalning';
    }
  } catch (error) {
    logError('Error getting product title:', error);
    return 'Betalning';
  }
}

// Lägg till en GET-metod för att testa att routen fungerar
export async function GET(request: Request) {
  try {
    // Verifiera Supabase-konfiguration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

    // Verifiera certifikatfiler - test
    const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    const testCertPath = process.env.SWISH_TEST_CERT_PATH || '';
    const resolvedTestCertPath = path.resolve(process.cwd(), testCertPath);
    const testCertExists = fs.existsSync(resolvedTestCertPath);
    
    // Verifiera certifikatfiler - produktion
    const prodCertPath = process.env.SWISH_PROD_CERT_PATH || '';
    const resolvedProdCertPath = path.resolve(process.cwd(), prodCertPath);
    const prodCertExists = fs.existsSync(resolvedProdCertPath);
    
    // Verifiera bundle-certifikat
    const bundlePath = 'certs/swish/prod/swish_bundle.pem';
    const resolvedBundlePath = path.resolve(process.cwd(), bundlePath);
    const bundleExists = fs.existsSync(resolvedBundlePath);
    
    const certInfo = {
      test_cert_path: testCertPath,
      test_cert_exists: testCertExists,
      prod_cert_path: prodCertPath,
      prod_cert_exists: prodCertExists,
      bundle_path: bundlePath,
      bundle_exists: bundleExists
    };
    
    // Testa hämtning av tjänst och konfiguration
    let swishServiceInfo = {};
    try {
      const swishService = SwishService.getInstance();
      swishServiceInfo = {
        payeeAlias: swishService.getPayeeAlias(),
        service_initialized: true
      };
    } catch (error) {
      swishServiceInfo = {
        service_initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json({ 
      status: 'ok', 
      message: 'Swish payment endpoint is working',
      timestamp: new Date().toISOString(),
      env: {
        test_mode: isTestMode,
        base_url: process.env.NEXT_PUBLIC_BASE_URL,
        swish_test_api_url: process.env.SWISH_TEST_API_URL,
        swish_prod_api_url: process.env.SWISH_PROD_API_URL,
        test_payee_alias: process.env.SWISH_TEST_PAYEE_ALIAS,
        prod_payee_alias: process.env.SWISH_PROD_PAYEE_ALIAS,
        certs: certInfo,
        swish_service: swishServiceInfo,
        has_supabase_config: hasSupabaseConfig
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      status: 'error',
      message: 'Failed to check configuration',
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST handler for creating Swish payments
 */
export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Log the incoming request
    logInfo(`[${requestId}] Creating Swish payment`, {
      method: request.method,
      url: request.url
    });

    // Parse the request body
    const requestData = await request.json();

    // Log the request data (masking sensitive information)
    logInfo(`[${requestId}] Request data`, {
      ...requestData,
      phoneNumber: requestData.phoneNumber ? `${requestData.phoneNumber.substring(0, 4)}****${requestData.phoneNumber.slice(-2)}` : undefined
    });

    // Generate payment reference
    const paymentReference = generatePaymentReference();
    
    // Create Swish payment
    const swishService = new SwishService();

    // Create payment
    const transaction = await swishService.createPayment({
      amount: requestData.amount,
      phoneNumber: requestData.phoneNumber,
      message: requestData.message,
      paymentReference: paymentReference,
      metadata: {
        productType: requestData.productType,
        productId: requestData.productId,
        userInfo: requestData.userInfo
      }
    });

    // Log processing time
    const processingTime = Date.now() - startTime;
    logInfo(`[${requestId}] Payment created successfully`, {
      processingTime: `${processingTime}ms`,
      swishPaymentId: transaction.swishPaymentId
    });

    // Return success response
    return NextResponse.json({
      status: 'OK',
      paymentId: transaction.paymentId,
      swishPaymentId: transaction.swishPaymentId
    }, { status: 200 });

  } catch (error) {
    // Log the error
    logError(`[${requestId}] Error creating Swish payment:`, error);

    // Try to log the error to Supabase
    try {
      await supabase.from('error_logs').insert({
        request_id: requestId,
        error_type: 'swish_create',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        request_data: await request.json().catch(() => null),
        processing_time: Date.now() - startTime
      });
    } catch (loggingError) {
      logError(`[${requestId}] Failed to log error to database:`, loggingError);
    }

    // Return error response
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'Failed to create payment',
        requestId
      },
      { status: 500 }
    );
  }
} 