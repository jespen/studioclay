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
    const baseUrl = isTestMode 
      ? 'https://mss.cpc.getswish.net'
      : 'https://cpc.getswish.net';
    const endpoint = '/swish-cpcapi/api/v1/paymentrequests';
    const url = `${baseUrl}${endpoint}`;

    // Load certificates
    const certPath = isTestMode ? process.env.SWISH_TEST_CERT_PATH! : process.env.SWISH_PROD_CERT_PATH!;
    const keyPath = isTestMode ? process.env.SWISH_TEST_KEY_PATH! : process.env.SWISH_PROD_KEY_PATH!;
    const caPath = isTestMode ? process.env.SWISH_TEST_CA_PATH! : process.env.SWISH_PROD_CA_PATH!;

    // Log certificate paths and check if they exist
    logDebug('Certificate paths:', {
      certPath: path.resolve(process.cwd(), certPath),
      keyPath: path.resolve(process.cwd(), keyPath),
      caPath: path.resolve(process.cwd(), caPath)
    });

    // Create HTTPS agent with certificates
    const agent = new https.Agent({
      cert: fs.readFileSync(path.resolve(process.cwd(), certPath)),
      key: fs.readFileSync(path.resolve(process.cwd(), keyPath)),
      ca: fs.readFileSync(path.resolve(process.cwd(), caPath)),
      minVersion: 'TLSv1.2'
    });

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

// Lägg till en GET-metod för att testa att routen fungerar
export async function GET(request: Request) {
  try {
    // Verifiera Supabase-konfiguration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

    // Verifiera certifikatfiler
    const certPath = process.env.SWISH_TEST_CERT_PATH || '';
    const resolvedCertPath = path.resolve(process.cwd(), certPath);
    const certExists = fs.existsSync(resolvedCertPath);

    return NextResponse.json({ 
      status: 'ok', 
      message: 'Swish payment endpoint is working',
      timestamp: new Date().toISOString(),
      env: {
        test_mode: process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true',
        base_url: process.env.NEXT_PUBLIC_BASE_URL,
        cert_exists: certExists,
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

      // For gift cards, we need to handle the product_id differently since it's not a UUID
      if (product_type === 'gift_card') {
        // Create a payment record with a proper UUID as product_id
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .insert({
            payment_method: 'swish',
            amount: amount,
            currency: 'SEK',
            payment_reference: paymentReference,
            product_type: product_type,
            // Generate a proper UUID
            product_id: crypto.randomUUID(),
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

      // Prepare Swish payment request data
      const swishPaymentData = {
        payeePaymentReference: paymentReference,
        callbackUrl: callbackUrl,
        payeeAlias: SwishService.getInstance().getPayeeAlias(),
        amount: amount.toString(),
        currency: "SEK",
        message: `Betalning för ${product_id}`.substring(0, 50), // Max 50 chars
        payerAlias: SwishService.getInstance().formatPhoneNumber(phone_number)
      };
      
      logDebug('Prepared Swish payment request data:', swishPaymentData);

      // Use SwishService to create payment
      logDebug('Calling SwishService to create payment');
      const swishService = SwishService.getInstance();
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
              console.error('Error creating art order:', orderError);
              throw new Error('Failed to create art order');
            }

            console.log('Created art order:', orderData);
            
            // Update product stock quantity
            try {
              // First get the current product to check stock_quantity
              const { data: productData, error: productFetchError } = await supabase
                .from('products')
                .select('stock_quantity, in_stock')
                .eq('id', product_id)
                .single();
                
              if (productFetchError) {
                console.error('Error fetching product for stock update:', productFetchError);
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
                  console.error('Error updating product stock:', updateError);
                } else {
                  console.log(`Updated product ${product_id} stock to ${newQuantity}`);
                }
              }
            } catch (stockError) {
              console.error('Error in stock quantity update:', stockError);
              // Continue - don't fail the transaction for stock update issues
            }
          } catch (error) {
            console.error('Error in art order creation:', error);
            throw error;
          }
      }

      return NextResponse.json({
        success: true,
        data: {
          reference: paymentReference
        }
      });
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