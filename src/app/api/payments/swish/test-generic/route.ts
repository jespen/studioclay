import { NextRequest, NextResponse } from 'next/server';
import { SwishService } from '@/services/swish/swishService';
import fs from 'fs';
import path from 'path';
import { logDebug, logError } from '@/lib/logging';
import { createClient } from '@supabase/supabase-js';
import { validate as uuidValidate } from 'uuid';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Simple test endpoint to diagnose Swish payment API issues
 * Usage: /api/payments/swish/test-generic?phone=07XXXXXXXX&type=gift_card|course|art_product&id=xxx&amount=100
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    const type = searchParams.get('type') || 'gift_card';
    const productId = searchParams.get('id') || '';
    const amount = parseInt(searchParams.get('amount') || '1');
    const messageOverride = searchParams.get('message');
    
    if (!phone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: phone'
      }, { status: 400 });
    }
    
    // Validate product type
    if (!['gift_card', 'course', 'art_product'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid product type. Must be one of: gift_card, course, art_product'
      }, { status: 400 });
    }
    
    // For course and art_product, validate that the ID is a valid UUID if provided
    // Otherwise, get a valid product to use
    let finalProductId = productId;
    let productValidationError = null;
    
    if ((type === 'course' || type === 'art_product') && productId) {
      if (!uuidValidate(productId)) {
        productValidationError = `Invalid UUID format for ${type} ID: ${productId}`;
        
        // Try to find a valid product to use instead
        try {
          if (type === 'course') {
            const { data: course } = await supabase
              .from('course_instances')
              .select('id')
              .eq('active', true)
              .limit(1)
              .single();
              
            if (course) {
              finalProductId = course.id;
              productValidationError += `. Using valid course ID: ${finalProductId}`;
            }
          } else { // art_product
            const { data: product } = await supabase
              .from('products')
              .select('id')
              .eq('in_stock', true)
              .limit(1)
              .single();
              
            if (product) {
              finalProductId = product.id;
              productValidationError += `. Using valid product ID: ${finalProductId}`;
            }
          }
        } catch (findError) {
          logError('Error finding substitute product:', findError);
        }
      }
    }
    
    // Generate payment reference
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const paymentReference = `SCT-${timestamp}-${randomNum}`;
    
    // Get product title based on type and ID
    let productTitle;
    try {
      if (type === 'course') {
        // Try to get real course title if ID is valid UUID
        try {
          const { data: course } = await supabase
            .from('course_instances')
            .select('*, course_templates(title)')
            .eq('id', finalProductId)
            .single();
          
          productTitle = course?.title || 
                      (course?.course_templates?.title) || 
                      'Test-kurs';
        } catch {
          productTitle = 'Test-kurs';
        }
      } else if (type === 'art_product') {
        // Try to get real product title if ID is valid UUID
        try {
          const { data: product } = await supabase
            .from('products')
            .select('title')
            .eq('id', finalProductId)
            .single();
          
          productTitle = product?.title || 'Test-produkt';
        } catch {
          productTitle = 'Test-produkt';
        }
      } else {
        // gift_card
        productTitle = 'Test-presentkort';
      }
    } catch (error) {
      logError('Error getting product title:', error);
      productTitle = 'Test-' + type;
    }
    
    // Get environment variables for debugging
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://studioclay.se';
    const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    const swishApiUrl = isTestMode 
      ? process.env.SWISH_TEST_API_URL 
      : process.env.SWISH_PROD_API_URL;
    
    // Prepare callback URL
    let callbackUrl = baseUrl;
    
    // Ensure https
    if (callbackUrl.startsWith('http:')) {
      callbackUrl = callbackUrl.replace('http://', 'https://');
    }
    
    // Remove www in production
    if (process.env.NODE_ENV === 'production' && callbackUrl.includes('www.studioclay.se')) {
      callbackUrl = callbackUrl.replace('www.studioclay.se', 'studioclay.se');
    }
    
    // Add callback path
    callbackUrl = callbackUrl.replace(/\/$/, '') + '/api/payments/swish/callback';
    
    // First create a payment record in the database for proper tracking
    try {
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert({
          payment_method: 'swish',
          amount: amount,
          currency: 'SEK',
          payment_reference: paymentReference,
          product_type: type,
          product_id: finalProductId,
          status: 'CREATED',
          user_info: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phone: phone,
            numberOfParticipants: '1'
          },
          phone_number: phone,
          metadata: {
            test: true,
            test_endpoint: 'test-generic',
            product_info: {
              type: type,
              id: finalProductId,
              title: productTitle
            }
          }
        })
        .select()
        .single();
      
      if (paymentError) {
        logError('Error creating payment record:', paymentError);
        return NextResponse.json({
          success: false,
          error: 'Database error: ' + paymentError.message,
          details: paymentError
        }, { status: 500 });
      }
      
      logDebug('Created payment record:', { 
        id: paymentRecord.id, 
        reference: paymentReference
      });
    } catch (dbError: any) {
      logError('Error inserting payment record:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database error: ' + dbError.message
      }, { status: 500 });
    }
    
    try {
      // Get certificate paths for debugging
      const certPath = isTestMode ? process.env.SWISH_TEST_CERT_PATH! : process.env.SWISH_PROD_CERT_PATH!;
      const keyPath = isTestMode ? process.env.SWISH_TEST_KEY_PATH! : process.env.SWISH_PROD_KEY_PATH!;
      const caPath = isTestMode ? process.env.SWISH_TEST_CA_PATH! : process.env.SWISH_PROD_CA_PATH!;
      
      const resolvedCertPath = path.resolve(process.cwd(), certPath);
      const resolvedKeyPath = path.resolve(process.cwd(), keyPath);
      const resolvedCaPath = path.resolve(process.cwd(), caPath);
      
      const certExists = fs.existsSync(resolvedCertPath);
      const keyExists = fs.existsSync(resolvedKeyPath);
      const caExists = fs.existsSync(resolvedCaPath);
      
      // Initialize SwishService
      const swishService = SwishService.getInstance();
      const formattedPhone = swishService.formatPhoneNumber(phone);
      
      // Construct Swish payment data
      const message = messageOverride || 
                    `studioclay.se - ${productTitle}${productValidationError ? ' (corrected)' : ''}`;
                    
      const swishPaymentData = {
        payeePaymentReference: paymentReference,
        callbackUrl: callbackUrl,
        payeeAlias: swishService.getPayeeAlias(),
        amount: amount.toString(),
        currency: "SEK",
        message: message.substring(0, 50),
        payerAlias: formattedPhone
      };
      
      // Make the API call
      logDebug(`[TEST-GENERIC] Making Swish API call for ${type} with phone ${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`);
      const result = await swishService.createPayment(swishPaymentData);
      
      // Update the payment record with Swish result
      if (result.success) {
        await supabase
          .from('payments')
          .update({
            swish_payment_id: result.data?.reference,
            swish_callback_url: callbackUrl,
            metadata: {
              test: true,
              test_endpoint: 'test-generic',
              product_info: {
                type: type,
                id: finalProductId,
                title: productTitle
              },
              swish_result: result,
              swish_request: {
                sent_at: new Date().toISOString(),
                data: {
                  ...swishPaymentData,
                  payerAlias: `${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`
                }
              }
            }
          })
          .eq('payment_reference', paymentReference);
      } else {
        await supabase
          .from('payments')
          .update({
            status: 'ERROR',
            metadata: {
              test: true,
              test_endpoint: 'test-generic',
              product_info: {
                type: type,
                id: finalProductId,
                title: productTitle
              },
              swish_result: result,
              swish_error: result.error,
              swish_request: {
                sent_at: new Date().toISOString(),
                data: {
                  ...swishPaymentData,
                  payerAlias: `${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`
                }
              }
            }
          })
          .eq('payment_reference', paymentReference);
      }
      
      // Return results
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
        debug: {
          type,
          originalProductId: productId,
          finalProductId,
          productIdCorrected: !!productValidationError,
          productValidationError,
          amount,
          callbackUrl,
          productTitle,
          paymentReference,
          swishApiUrl,
          isTestMode,
          certificates: {
            certPath,
            keyPath,
            caPath,
            certExists,
            keyExists,
            caExists
          }
        }
      });
    } catch (swishError) {
      logError('Error in Swish test call:', swishError);
      
      // Update payment record with error
      await supabase
        .from('payments')
        .update({
          status: 'ERROR',
          metadata: {
            test: true,
            test_endpoint: 'test-generic',
            product_info: {
              type: type,
              id: finalProductId,
              title: productTitle
            },
            error: swishError instanceof Error ? swishError.message : 'Unknown error'
          }
        })
        .eq('payment_reference', paymentReference);
        
      return NextResponse.json({
        success: false,
        error: swishError instanceof Error ? swishError.message : 'Unknown error',
        debug: {
          type,
          originalProductId: productId,
          finalProductId,
          productIdCorrected: !!productValidationError,
          productValidationError,
          amount,
          callbackUrl,
          productTitle,
          paymentReference
        }
      }, { status: 500 });
    }
  } catch (error) {
    logError('Unhandled error in test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 