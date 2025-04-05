import { NextRequest, NextResponse } from 'next/server';
import { SwishService } from '@/services/swish/swishService';
import { logDebug, logError } from '@/lib/logging';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Test endpoint specifically for gift card payments
 * Usage: /api/payments/swish/test-giftcard?phone=07XXXXXXXX&amount=100&recipient_name=Test&recipient_email=test@example.com&message=Test
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    const amount = parseInt(searchParams.get('amount') || '100');
    const recipientName = searchParams.get('recipient_name') || 'Test User';
    const recipientEmail = searchParams.get('recipient_email') || 'test@example.com';
    const message = searchParams.get('message') || 'Test gift card';
    const type = searchParams.get('type') || 'digital';
    
    if (!phone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: phone',
        usage: '/api/payments/swish/test-giftcard?phone=07XXXXXXXX&amount=100&recipient_name=Test&recipient_email=test@example.com&message=Test'
      }, { status: 400 });
    }
    
    // Generate payment reference and gift card ID
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const paymentReference = `GFCT-${timestamp}-${randomNum}`;
    
    // For gift cards, we don't need a real UUID
    const giftCardId = `gift-card-test-${timestamp}-${randomNum}`;
    
    // Prepare user info
    const userInfo = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: phone,
      numberOfParticipants: '1'
    };
    
    // Prepare item details
    const itemDetails = {
      type: type,
      recipientName: recipientName,
      recipientEmail: recipientEmail,
      message: message
    };
    
    try {
      // Create payment record in database first
      logDebug('Creating gift card payment record in database');
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          payment_method: 'swish',
          amount: amount,
          currency: 'SEK',
          payment_reference: paymentReference,
          product_type: 'gift_card',
          product_id: giftCardId,
          status: 'CREATED',
          user_info: userInfo,
          phone_number: phone,
          metadata: {
            test: true,
            item_details: itemDetails
          }
        })
        .select()
        .single();
        
      if (paymentError) {
        logError('Failed to create gift card payment record:', paymentError);
        return NextResponse.json({
          success: false,
          error: `Failed to create payment record: ${paymentError.message}`,
          details: paymentError
        }, { status: 500 });
      }
      
      logDebug('Gift card payment record created successfully:', {
        id: paymentData.id,
        reference: paymentReference
      });
      
      // Prepare callback URL
      let callbackUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://studioclay.se';
      
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
      
      // Initialize SwishService
      const swishService = SwishService.getInstance();
      const formattedPhone = swishService.formatPhoneNumber(phone);
      
      // Construct Swish payment data
      const swishPaymentData = {
        payeePaymentReference: paymentReference,
        callbackUrl: callbackUrl,
        payeeAlias: swishService.getPayeeAlias(),
        amount: amount.toString(),
        currency: "SEK",
        message: `studioclay.se - Presentkort`.substring(0, 50),
        payerAlias: formattedPhone
      };
      
      // Make the API call
      logDebug(`[TEST-GIFTCARD] Making Swish API call with phone ${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`);
      const result = await swishService.createPayment(swishPaymentData);
      
      // Update payment record with Swish result
      if (result.success) {
        await supabase
          .from('payments')
          .update({
            swish_payment_id: result.data?.reference,
            swish_callback_url: callbackUrl,
            metadata: {
              ...paymentData.metadata,
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
          
        // If successful, create a gift card record
        if (result.success) {
          try {
            const { data: giftCardData, error: giftCardError } = await supabase
              .from('gift_cards')
              .insert({
                code: generateGiftCardCode(),
                amount: amount,
                customer_name: `${userInfo.firstName} ${userInfo.lastName}`,
                customer_email: userInfo.email,
                recipient_name: recipientName,
                recipient_email: recipientEmail,
                message: message,
                status: 'pending',
                payment_reference: paymentReference,
                order_reference: paymentReference, // Use same reference for consistency
                type: type,
                expires_at: getExpiryDate()
              })
              .select()
              .single();
              
            if (giftCardError) {
              logError('Error creating gift card record:', giftCardError);
            } else {
              logDebug('Gift card record created:', {
                id: giftCardData.id,
                code: giftCardData.code
              });
              
              // Update payment with gift card ID
              await supabase
                .from('payments')
                .update({
                  product_id: giftCardData.id,
                  metadata: {
                    ...paymentData.metadata,
                    gift_card_id: giftCardData.id,
                    gift_card_code: giftCardData.code
                  }
                })
                .eq('payment_reference', paymentReference);
            }
          } catch (giftCardCreateError: any) {
            logError('Error in gift card creation:', giftCardCreateError);
          }
        }
      } else {
        await supabase
          .from('payments')
          .update({
            status: 'ERROR',
            metadata: {
              ...paymentData.metadata,
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
          payment_reference: paymentReference,
          gift_card_id: giftCardId,
          amount,
          recipient: {
            name: recipientName,
            email: recipientEmail,
            message: message,
            type: type
          },
          user_info: userInfo,
          callback_url: callbackUrl
        }
      });
    } catch (error: any) {
      logError('Error in gift card test:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        stack: error.stack
      }, { status: 500 });
    }
  } catch (error: any) {
    logError('Unhandled error in gift card test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

/**
 * Generate a random gift card code
 */
function generateGiftCardCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar looking characters
  let code = '';
  
  // Generate 4 groups of 4 characters separated by hyphens
  for (let group = 0; group < 4; group++) {
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (group < 3) code += '-';
  }
  
  return code;
}

/**
 * Get expiry date for gift card (1 year from now)
 */
function getExpiryDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
} 