import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logDebug, logError } from '@/lib/logging';
import https from 'https';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { SwishService } from '@/services/swish/swishService';
import { SwishPaymentData } from '@/services/swish/types';
import { setupCertificate } from '../cert-helper';

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

// Unified schema for all payment types
const SwishPaymentSchema = z.object({
  phone_number: z.string()
    .min(10, 'Telefonnummer måste vara minst 10 siffror')
    .max(15, 'Telefonnummer får inte vara längre än 15 siffror'),
  payment_method: z.literal('swish'),
  product_type: z.enum(['course', 'gift_card', 'art_product']),
  product_id: z.string().uuid('Ogiltigt produkt-ID'),
  amount: z.number()
    .min(1, 'Beloppet måste vara större än 0')
    .max(999999, 'Beloppet får inte överstiga 999999'),
  quantity: z.number()
    .min(1, 'Antal måste vara minst 1')
    .default(1),
  user_info: z.object({
    firstName: z.string().min(1, 'Förnamn är obligatoriskt'),
    lastName: z.string().min(1, 'Efternamn är obligatoriskt'),
    email: z.string().email('Ogiltig e-postadress'),
    phone: z.string().min(10, 'Telefonnummer måste vara minst 10 siffror'),
    numberOfParticipants: z.string().optional(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional()
  }).required()
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
          .select('*, course_templates(title)')
          .eq('id', productId)
          .single();
        
        if (courseError || !course) {
          logError('Error fetching course title:', courseError);
          return 'Kurs';
        }
        
        // Använd kursinstansens titel om den finns, annars template-titeln
        const courseTitle = course.title || 
                          (course.course_templates?.title) || 
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

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    const body = await request.json();
    
    // Parse with error handling
    const parseResult = SwishPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      logError('Validation error:', parseResult.error);
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: parseResult.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }
    
    const validatedData = parseResult.data;
    
    const {
      phone_number,
      payment_method,
      product_type,
      product_id,
      amount,
      quantity,
      user_info
    } = validatedData;

    // Basic validation based on product type
    try {
      if (product_type === 'course') {
        const { data: course } = await supabase
          .from('courses')
          .select('spots_available')
          .eq('id', product_id)
          .single();
          
        if (!course || course.spots_available < quantity) {
          return NextResponse.json({
            success: false,
            error: 'Course is full or not available'
          }, { status: 400 });
        }
      } 
      else if (product_type === 'art_product') {
        const { data: product } = await supabase
          .from('products')
          .select('in_stock, stock_quantity')
          .eq('id', product_id)
          .single();
          
        if (!product?.in_stock || (product.stock_quantity || 0) < quantity) {
          return NextResponse.json({
            success: false,
            error: 'Product not available'
          }, { status: 400 });
        }
      }
    } catch (error) {
      logError('Error checking product availability:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify product availability'
      }, { status: 500 });
    }

    // Generate payment reference
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const paymentReference = `${timestamp}-${random}`;

    // Create payment record with CREATED status
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        status: 'CREATED',
        payment_method,
        amount,
        currency: 'SEK',
        payment_reference: paymentReference,
        product_type,
        product_id,
        user_info,
        metadata: {
          idempotency_key: request.headers.get('Idempotency-Key'),
          quantity
        },
        phone_number: phone_number
      })
      .select()
      .single();

    if (paymentError) {
      logError('Failed to create payment record:', paymentError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create payment record'
      }, { status: 500 });
    }

    // Initialize Swish service
    const swishService = SwishService.getInstance();

    // Construct callback URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const callbackUrl = `${protocol}://${host}/api/payments/swish/callback`;

    // Format phone number for Swish
    const swishPhoneNumber = swishService.formatPhoneNumber(phone_number);

    // Get product title for payment message
    let productTitle = await getProductTitle(product_type, product_id);

    // Create Swish payment request
    const swishResult = await swishService.createPayment({
      payeeAlias: swishService.getPayeeAlias(),
      amount: amount.toString(),
      currency: 'SEK',
      message: productTitle,
      payerAlias: swishPhoneNumber,
      callbackUrl,
      payeePaymentReference: paymentReference
    });

    if (!swishResult.success) {
      logError('Failed to create Swish payment:', swishResult.error);
      // Update payment status to ERROR
      await supabase
        .from('payments')
        .update({ status: 'ERROR' })
        .eq('payment_reference', paymentReference);
        
      return NextResponse.json({
        success: false,
        error: swishResult.error || 'Failed to create Swish payment'
      }, { status: 500 });
    }

    // Return only the payment reference
    return NextResponse.json({
      success: true,
      paymentReference
    });

  } catch (error) {
    logError('Error in payment creation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 