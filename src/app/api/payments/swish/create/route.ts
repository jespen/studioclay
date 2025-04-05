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
    numberOfParticipants: z.string().transform(val => Number(val) || 1)
  }),
  itemDetails: z.object({
    type: z.string().optional(),
    recipientName: z.string().optional(),
    recipientEmail: z.string().email().optional(),
    message: z.string().optional()
  }).nullable().optional()
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
    
    // Log the received request body for debugging
    logDebug('Received Swish payment request body:', body);
    
    try {
      // Validate the request body
      logDebug('Attempting to validate request body');
      const validatedData = SwishPaymentSchema.parse(body);
      logDebug('Request body validation successful', validatedData);
      
      const { phone_number, product_id, product_type, user_info, amount } = validatedData;

      // Generate payment reference (max 35 chars, alphanumeric)
      const timestamp = new Date().getTime().toString().slice(-6);
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const paymentReference = `SC-${timestamp}-${randomNum}`;

      // Prepare metadata including idempotency key
      const metadata: PaymentMetadata = {
        idempotency_key: request.headers.get('Idempotency-Key')
      };
      
      // If this is a gift card payment, store item details in metadata
      if (product_type === 'gift_card') {
        logDebug('Processing gift card payment, extracting item details');
        // Retrieve gift card details from localStorage or request
        const storedDetails = body.itemDetails || {};
        logDebug('Gift card details from request:', storedDetails);
        
        metadata.item_details = {
          type: storedDetails.type || 'digital',
          recipientName: storedDetails.recipientName || '',
          recipientEmail: storedDetails.recipientEmail || '',
          message: storedDetails.message || ''
        };
        
        logDebug('Prepared metadata for gift card payment:', metadata);
      }

      // Create payment record in database first
      logDebug('Creating payment record in database');

      // Declare the payment variable at a higher scope
      let payment;

      // Handle idempotency if key is provided
      if (metadata.idempotency_key) {
        const existingPayment = await checkIdempotency(metadata.idempotency_key);
        if (existingPayment) {
          logDebug('Found existing payment with same idempotency key:', existingPayment.payment_reference);
          return NextResponse.json({
            success: true,
            message: 'Payment request already processed',
            data: {
              reference: existingPayment.payment_reference
            }
          });
        }
      }

      // Check if this is a gift card or shop purchase
      if (product_type === 'gift_card' || product_type === 'art_product') {
        // Create a more generic payment record for non-course products
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
            metadata: metadata
          })
          .select()
          .single();

        if (paymentError) {
          logError('Failed to create payment record in database', paymentError);
          throw new Error(`Failed to create payment record: ${paymentError.message}`);
        }
        
        payment = paymentData;
        logDebug('Payment record created successfully', payment);
      } else {
        // Normal course booking flow
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .insert({
            payment_method: 'swish',
            amount: amount,
            currency: 'SEK',
            payment_reference: paymentReference,
            product_type: product_type,
            product_id: product_id, // This is a valid UUID for courses
            status: 'CREATED',
            user_info: user_info,
            phone_number: phone_number,
            metadata: metadata
          })
          .select()
          .single();

        if (paymentError) {
          logError('Failed to create payment record in database', paymentError);
          throw new Error(`Failed to create payment record: ${paymentError.message}`);
        }
        
        payment = paymentData;
        logDebug('Payment record created successfully', payment);
      }

      // Ensure callback URL uses HTTPS
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const callbackUrl = baseUrl.replace('http://', 'https://') + '/api/payments/swish/callback';
      
      logDebug('Using callback URL:', callbackUrl);

      // Prepare Swish payment request data
      try {
        // Ensure phone number is correctly formatted
        const swishService = SwishService.getInstance();
        const formattedPhone = swishService.formatPhoneNumber(phone_number);
        
        logDebug('Formatted phone number:', { 
          original: phone_number, 
          formatted: formattedPhone 
        });

        // Hämta produkttitel för meddelande
        const productTitle = await getProductTitle(product_type, product_id);
        logDebug('Got product title for Swish message:', productTitle);

        const swishPaymentData = {
          payeePaymentReference: paymentReference,
          callbackUrl: callbackUrl,
          payeeAlias: swishService.getPayeeAlias(),
          amount: amount.toString(),
          currency: "SEK",
          message: `studioclay.se - ${productTitle}`.substring(0, 50), // Max 50 chars för Swish-meddelande
          payerAlias: formattedPhone
        };
        
        logDebug('Prepared Swish payment request data:', {
          ...swishPaymentData,
          payerAlias: `${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`
        });

        // Use SwishService to create payment
        logDebug('Calling SwishService to create payment');
        const result = await swishService.createPayment(swishPaymentData);
        
        logDebug('SwishService createPayment result:', result);

        if (!result.success) {
          logError('Swish payment request failed', result);
          // If Swish request fails, update payment status to ERROR
          await supabase
            .from('payments')
            .update({ 
              status: 'ERROR',
              metadata: {
                ...payment.metadata,
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

        logDebug('Swish payment request successful');
        
        // Handle art_product logic if this is an art product
        if (product_type === 'art_product') {
          try {
            // Create art order record
            const { data: orderData, error: orderError } = await supabase
              .from('art_orders')
              .insert({
                product_id: product_id,
                customer_name: user_info.firstName + ' ' + user_info.lastName,
                customer_email: user_info.email,
                customer_phone: phone_number,
                payment_method: 'swish',
                order_reference: paymentReference,
                unit_price: amount,
                total_price: amount,
                status: 'confirmed',
                metadata: {
                  payment_id: payment.id,
                  user_info: user_info
                }
              })
              .select()
              .single();

            if (orderError) {
              logError('Error creating art order:', orderError);
              throw new Error('Failed to create art order');
            }

            logDebug('Created art order:', orderData);
            
            // Update product stock quantity
            try {
              // First get the current product to check stock_quantity
              const { data: productData, error: productFetchError } = await supabase
                .from('products')
                .select('title, price, description, image, stock_quantity, in_stock')
                .eq('id', product_id)
                .single();
                
              if (productFetchError) {
                logError('Error fetching product for stock update:', productFetchError);
                // Continue execution - stock update is not critical for payment process
              } else if (productData) {
                // Calculate new stock quantity
                const newQuantity = Math.max(0, (productData.stock_quantity || 1) - 1);
                
                // Update the product with new stock quantity
                const { error: updateError } = await supabase
                  .from('products')
                  .update({ 
                    stock_quantity: newQuantity,
                    in_stock: newQuantity > 0
                  })
                  .eq('id', product_id);
                  
                if (updateError) {
                  logError('Error updating product stock:', updateError);
                } else {
                  logDebug(`Updated product ${product_id} stock to ${newQuantity}`);
                }
                
                // Send product order confirmation email
                const { sendServerProductOrderConfirmationEmail } = await import('@/utils/serverEmail');
                
                logDebug('Sending product order confirmation email');
                const emailResult = await sendServerProductOrderConfirmationEmail({
                  userInfo: {
                    firstName: user_info.firstName,
                    lastName: user_info.lastName,
                    email: user_info.email,
                    phone: user_info.phone || phone_number
                  },
                  paymentDetails: {
                    method: 'swish',
                    status: 'PAID',
                    reference: paymentReference,
                    amount: amount
                  },
                  productDetails: {
                    id: product_id,
                    title: productData.title,
                    description: productData.description,
                    price: amount,
                    quantity: 1,
                    image: productData.image
                  },
                  orderReference: paymentReference
                });
                
                logDebug('Email sending result:', emailResult);
              }
            } catch (stockError) {
              logError('Error in stock quantity update or email sending:', stockError);
              // Continue - don't fail the transaction for stock update or email issues
            }
          } catch (error) {
            logError('Error in art order creation:', error);
            throw error;
          }
        }
        
        return NextResponse.json({
          success: true,
          data: {
            reference: paymentReference
          }
        });
      } catch (swishError) {
        logError('Error in Swish payment processing:', swishError);
        // Update payment status to ERROR in database
        await supabase
          .from('payments')
          .update({ 
            status: 'ERROR',
            metadata: {
              ...payment.metadata,
              error_message: swishError instanceof Error ? swishError.message : 'Unknown error'
            }
          })
          .eq('payment_reference', paymentReference);
          
        return NextResponse.json({
          success: false,
          error: swishError instanceof Error ? swishError.message : 'Unknown error',
          details: {
            message: 'Swish payment processing error',
            payment_reference: paymentReference
          }
        }, { status: 500 });
      }
    } catch (validationError) {
      logError('Validation error in request body', validationError);
      return NextResponse.json({
        success: false,
        error: validationError instanceof Error ? validationError.message : 'Validation error',
        validationError: true
      }, { status: 400 });
    }
  } catch (error) {
    logError('Unhandled error in POST handler', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 