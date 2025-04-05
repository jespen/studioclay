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
  try {
    // Konfigurera certifikat i produktionsmiljö om vi använder Swish i produktionsläge
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SWISH_TEST_MODE !== 'true') {
      logDebug('Setting up Swish certificates from environment variables in create endpoint');
      const certSetupResult = setupCertificate();
      
      if (!certSetupResult.success) {
        logError('Failed to set up Swish certificates in create endpoint:', certSetupResult);
        return NextResponse.json({
          success: false,
          error: 'Failed to set up Swish certificates',
          details: 'Configuration error'
        }, { status: 500 });
      }
    }
    
    const body = await request.json();
    
    try {
      // Validate the request body
      const validatedData = SwishPaymentSchema.parse(body);
      const { phone_number, product_id, product_type, user_info, amount, quantity } = validatedData;

      // Generate payment reference
      const timestamp = new Date().getTime().toString().slice(-6);
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const paymentReference = `SC-${timestamp}-${randomNum}`;

      // Create generic payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          payment_method: 'swish',
          amount: amount,
          currency: 'SEK',
          payment_reference: paymentReference,
          product_type: product_type,
          product_id: product_id,
          status: 'CREATED',
          user_info: user_info,
          phone_number: phone_number,
          metadata: {
            idempotency_key: request.headers.get('Idempotency-Key'),
            quantity: quantity
          }
        })
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Failed to create payment record: ${paymentError.message}`);
      }

      // Get base URL and create callback URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      let callbackUrl = baseUrl.replace('http://', 'https://');
      
      // Use non-www domain in production
      if (process.env.NODE_ENV === 'production' && callbackUrl.includes('www.studioclay.se')) {
        callbackUrl = callbackUrl.replace('www.studioclay.se', 'studioclay.se');
      }
      
      // Add callback path
      const callbackPath = '/api/payments/swish/callback';
      callbackUrl = callbackUrl.endsWith('/') 
        ? callbackUrl + callbackPath.substring(1)
        : callbackUrl + callbackPath;

      try {
        // Format phone number and get product title
        const swishService = SwishService.getInstance();
        const formattedPhone = swishService.formatPhoneNumber(phone_number);
        const productTitle = await getProductTitle(product_type, product_id);

        // Create Swish payment request
        const swishPaymentData = {
          payeePaymentReference: paymentReference,
          callbackUrl: callbackUrl,
          payeeAlias: swishService.getPayeeAlias(),
          amount: amount.toString(),
          currency: "SEK",
          message: `studioclay.se - ${productTitle}`.substring(0, 50),
          payerAlias: formattedPhone
        };

        const result = await swishService.createPayment(swishPaymentData);

        if (!result.success) {
          // Update payment status to ERROR if Swish request fails
          await supabase
            .from('payments')
            .update({ 
              status: 'ERROR',
              metadata: {
                ...paymentData.metadata,
                swish_error: result.error
              }
            })
            .eq('payment_reference', paymentReference);

          return NextResponse.json({
            success: false,
            error: result.error,
            details: result.data
          }, { status: 400 });
        }

        // Update payment with Swish details
        if (result.data?.reference) {
          await supabase
            .from('payments')
            .update({
              swish_payment_id: result.data.reference,
              swish_callback_url: callbackUrl,
              metadata: {
                ...paymentData.metadata,
                swish_request: {
                  sent_at: new Date().toISOString(),
                  data: {
                    ...swishPaymentData,
                    payerAlias: `${swishPaymentData.payerAlias.substring(0, 4)}****${swishPaymentData.payerAlias.slice(-2)}`
                  }
                }
              }
            })
            .eq('payment_reference', paymentReference);
        }

        // Handle product-specific logic
        if (product_type === 'art_product') {
          await handleArtProduct(product_id, user_info, phone_number, amount, paymentReference, paymentData.id);
        }

        return NextResponse.json({
          success: true,
          data: {
            reference: paymentReference
          }
        });

      } catch (swishError) {
        throw swishError;
      }
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: validationError instanceof Error ? validationError.message : 'Validation error',
        validationError: true
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to handle art product specific logic
async function handleArtProduct(
  productId: string,
  userInfo: any,
  phoneNumber: string,
  amount: number,
  paymentReference: string,
  paymentId: string
) {
  try {
    // Create art order record
    const { data: orderData, error: orderError } = await supabase
      .from('art_orders')
      .insert({
        product_id: productId,
        customer_name: `${userInfo.firstName} ${userInfo.lastName}`,
        customer_email: userInfo.email,
        customer_phone: phoneNumber,
        payment_method: 'swish',
        order_reference: paymentReference,
        unit_price: amount,
        total_price: amount,
        status: 'confirmed',
        metadata: {
          payment_id: paymentId,
          user_info: userInfo
        }
      })
      .select()
      .single();

    if (orderError) {
      throw new Error('Failed to create art order');
    }

    // Update product stock
    const { data: productData, error: productFetchError } = await supabase
      .from('products')
      .select('title, price, description, image, stock_quantity, in_stock')
      .eq('id', productId)
      .single();

    if (!productFetchError && productData) {
      const newQuantity = Math.max(0, (productData.stock_quantity || 1) - 1);
      
      await supabase
        .from('products')
        .update({ 
          stock_quantity: newQuantity,
          in_stock: newQuantity > 0
        })
        .eq('id', productId);

      // Send confirmation email
      const { sendServerProductOrderConfirmationEmail } = await import('@/utils/serverEmail');
      
      await sendServerProductOrderConfirmationEmail({
        userInfo: {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          phone: userInfo.phone || phoneNumber
        },
        paymentDetails: {
          method: 'swish',
          status: 'PAID',
          reference: paymentReference,
          amount: amount
        },
        productDetails: {
          id: productId,
          title: productData.title,
          description: productData.description,
          price: amount,
          quantity: 1,
          image: productData.image
        },
        orderReference: paymentReference
      });
    }
  } catch (error) {
    // Log error but don't throw - we don't want to fail the payment process
    console.error('Error in art product handling:', error);
  }
} 