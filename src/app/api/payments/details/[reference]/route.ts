import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import { logError, logInfo, logWarning } from '@/lib/logging';

/**
 * API endpoint to get payment details by reference
 * Also fetches related gift card information if the payment was for a gift card
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  const requestId = uuidv4();
  const reference = params.reference;
  
  if (!reference) {
    return NextResponse.json({
      success: false,
      message: 'Payment reference is required'
    }, { status: 400 });
  }
  
  try {
    logInfo(`Fetching payment details for reference: ${reference}`, {
      requestId,
      reference
    });
    
    const supabase = createServerSupabaseClient();
    
    // Fetch payment details
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', reference)
      .maybeSingle();
    
    if (error) {
      logError(`Error fetching payment details`, {
        requestId,
        reference,
        error: error.message
      });
      
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve payment information',
        details: error.message
      }, { status: 500 });
    }
    
    if (!payment) {
      logWarning(`Payment not found for reference: ${reference}`, {
        requestId,
        reference
      });
      
      return NextResponse.json({
        success: false,
        message: `No payment found with reference: ${reference}`
      }, { status: 404 });
    }
    
    // Prepare response data
    const responseData: {
      paymentReference: string;
      invoiceNumber?: string;
      status: string;
      amount: number;
      createdAt: string;
      productType: string;
      userInfo: any;
      metadata: any;
      giftCard: any; // Using 'any' type to allow null or gift card object
    } = {
      paymentReference: payment.payment_reference,
      invoiceNumber: payment.invoice_number,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.created_at,
      productType: payment.product_type,
      userInfo: payment.user_info,
      metadata: payment.metadata || {},
      giftCard: null
    };
    
    // If payment was for a gift card, fetch gift card details
    if (payment.product_type === 'gift_card' && payment.product_id) {
      logInfo(`Fetching gift card details for payment`, {
        requestId,
        reference,
        productId: payment.product_id
      });
      
      const { data: giftCard, error: giftCardError } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('id', payment.product_id)
        .maybeSingle();
      
      if (giftCardError) {
        logWarning(`Error fetching gift card details`, {
          requestId,
          reference,
          productId: payment.product_id,
          error: giftCardError.message
        });
      } else if (giftCard) {
        logInfo(`Gift card details retrieved successfully`, {
          requestId,
          reference,
          giftCardId: giftCard.id,
          hasCode: !!giftCard.code
        });
        
        // Check if we need to update the gift card with payment reference
        if (!giftCard.payment_reference && payment.payment_reference) {
          logInfo(`Updating gift card with payment reference`, {
            requestId,
            reference,
            giftCardId: giftCard.id
          });
          
          await supabase
            .from('gift_cards')
            .update({ payment_reference: payment.payment_reference })
            .eq('id', giftCard.id);
            
          // Update the retrieved gift card data with the payment reference
          giftCard.payment_reference = payment.payment_reference;
        }
        
        // Get gift card PDF URL if available
        let pdfUrl = null;
        if (giftCard.pdf_url) {
          pdfUrl = giftCard.pdf_url;
        } else {
          // Try to construct URL using payment reference
          const fileName = giftCard.payment_reference || payment.payment_reference || giftCard.code;
          if (fileName) {
            pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/giftcards/${fileName.replace(/[^a-zA-Z0-9-_.]/g, '_')}.pdf`;
          }
        }
        
        // Extract message from gift card details
        let message = '';
        try {
          if (giftCard.details && typeof giftCard.details === 'object') {
            message = giftCard.details.message || '';
          }
        } catch (e) {
          logWarning(`Could not extract message from gift card details`, {
            requestId,
            reference,
            giftCardId: giftCard.id
          });
        }
        
        // Convert database structure to frontend structure
        responseData.giftCard = {
          id: giftCard.id,
          code: giftCard.code,
          amount: giftCard.amount,
          status: giftCard.status,
          recipientName: giftCard.recipient_name || giftCard.details?.recipientName,
          recipientEmail: giftCard.recipient_email || giftCard.details?.recipientEmail,
          senderName: giftCard.sender_name || payment.user_info?.firstName + ' ' + payment.user_info?.lastName,
          message: message,
          createdAt: giftCard.created_at,
          expiresAt: giftCard.expires_at,
          pdfUrl: pdfUrl
        };
      }
    }
    
    logInfo(`Payment details retrieved successfully`, {
      requestId,
      reference,
      hasGiftCard: !!responseData.giftCard
    });
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    logError(`Unexpected error retrieving payment details`, {
      requestId,
      reference,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      message: 'An unexpected error occurred'
    }, { status: 500 });
  }
} 