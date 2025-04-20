import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logInfo, logError, logWarning } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint to fetch gift card details by payment reference
 * 
 * This endpoint allows retrieving gift card data using a payment reference
 * instead of the gift card code, which is useful for confirmation pages
 * where we might not have the code yet.
 */
export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  
  try {
    // Get payment reference from query parameters
    const searchParams = request.nextUrl.searchParams;
    const paymentReference = searchParams.get('reference');
    
    if (!paymentReference) {
      logWarning(`Missing payment reference in request`, {
        requestId,
        params: Object.fromEntries(searchParams.entries())
      });
      
      return NextResponse.json({
        success: false,
        message: 'Payment reference is required'
      }, { status: 400 });
    }
    
    logInfo(`Fetching gift card by payment reference ${paymentReference}`, {
      requestId,
      paymentReference
    });
    
    // Create Supabase client
    const supabase = createServerSupabaseClient();
    
    // First, try to get the gift card with the exact payment reference
    let { data: giftCard, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('payment_reference', paymentReference)
      .maybeSingle();
    
    // If no results or error, try alternate query methods
    if (!giftCard || error) {
      logInfo(`No gift card found with exact payment reference match, trying alternative lookups`, {
        requestId,
        paymentReference,
        error: error?.message
      });
      
      // Try to find by ILIKE (case insensitive, partial match)
      const { data: giftCardPartialMatch, error: partialMatchError } = await supabase
        .from('gift_cards')
        .select('*')
        .ilike('payment_reference', `%${paymentReference}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (giftCardPartialMatch && !partialMatchError) {
        giftCard = giftCardPartialMatch;
        
        logInfo(`Found gift card with partial payment reference match`, {
          requestId,
          paymentReference,
          matchedPaymentReference: giftCard.payment_reference,
          giftCardId: giftCard.id
        });
      } else if (partialMatchError) {
        // Log the error but continue with other attempts
        logWarning(`Error in partial match query`, {
          requestId,
          error: partialMatchError.message
        });
      }
    }
    
    // If still no results, try to find by payment record
    if (!giftCard) {
      logInfo(`No gift card found with payment reference, checking payments table`, {
        requestId,
        paymentReference
      });
      
      // Get payment to find product_id
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('product_id')
        .eq('payment_reference', paymentReference)
        .maybeSingle();
      
      if (payment && !paymentError) {
        // Try to find gift card using the product_id from payment
        const { data: giftCardByProductId, error: productIdError } = await supabase
          .from('gift_cards')
          .select('*')
          .eq('id', payment.product_id)
          .maybeSingle();
        
        if (giftCardByProductId && !productIdError) {
          giftCard = giftCardByProductId;
          
          logInfo(`Found gift card through payment record product_id`, {
            requestId,
            paymentReference,
            productId: payment.product_id,
            giftCardId: giftCard.id
          });
          
          // Update the gift card with the payment reference if missing
          if (!giftCard.payment_reference) {
            const { error: updateError } = await supabase
              .from('gift_cards')
              .update({ payment_reference: paymentReference })
              .eq('id', giftCard.id);
            
            if (updateError) {
              logWarning(`Failed to update gift card with payment reference`, {
                requestId,
                giftCardId: giftCard.id,
                paymentReference,
                error: updateError.message
              });
            } else {
              logInfo(`Updated gift card with payment reference`, {
                requestId,
                giftCardId: giftCard.id,
                paymentReference
              });
              
              // Update the local object with the payment reference
              giftCard.payment_reference = paymentReference;
            }
          }
        } else if (productIdError) {
          logWarning(`Error finding gift card by product_id`, {
            requestId,
            productId: payment.product_id,
            error: productIdError.message
          });
        }
      } else if (paymentError) {
        logWarning(`Error finding payment record`, {
          requestId,
          paymentReference,
          error: paymentError.message
        });
      }
    }
    
    // If we still don't have a gift card, return a 404
    if (!giftCard) {
      logWarning(`Gift card not found with payment reference ${paymentReference}`, {
        requestId,
        paymentReference
      });
      
      return NextResponse.json({
        success: false,
        message: `No gift card found with payment reference ${paymentReference}`
      }, { status: 404 });
    }
    
    logInfo(`Successfully retrieved gift card`, {
      requestId,
      giftCardId: giftCard.id,
      code: giftCard.code,
      paymentReference: giftCard.payment_reference
    });
    
    // Return gift card data with a 200 status
    return NextResponse.json({
      success: true,
      data: giftCard
    });
    
  } catch (error) {
    logError(`Exception in gift card lookup by reference`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
} 