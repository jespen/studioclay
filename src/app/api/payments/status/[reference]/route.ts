import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logDebug, logError } from "@/lib/logging";
import { SwishService } from "@/services/swish/swishService";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const reference = params.reference;
    
    logDebug(`Fetching payment status for reference: ${reference}`);
    
    if (!reference) {
      logError('Missing payment reference');
      return NextResponse.json({ success: false, error: 'Missing payment reference' }, { status: 400 });
    }

    // Query the payments table for the payment with the given reference
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, bookings(*)')
      .eq('payment_reference', reference)
      .maybeSingle();

    if (paymentError) {
      logError('Error fetching payment data from database:', paymentError);
      return NextResponse.json({ success: false, error: 'Failed to fetch payment data' }, { status: 500 });
    }

    // If no payment found with the given reference
    if (!payment) {
      logError(`No payment found with reference: ${reference}`);
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    logDebug('Payment data fetched successfully:', { 
      reference,
      status: payment.status,
      swish_payment_id: payment.swish_payment_id,
      bookingReference: payment.bookings?.reference,
      hasBooking: !!payment.bookings
    });

    // Om betalningens status fortfarande är CREATED och det har gått längre tid än 1 minut,
    // och vi har ett Swish-betalnings-ID, kan vi försöka fråga Swish direkt om status
    const paymentCreatedAt = new Date(payment.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - paymentCreatedAt.getTime()) / (1000 * 60);
    const hasSwishPaymentId = payment.swish_payment_id && payment.swish_payment_id !== reference;

    let swishStatus = null;
    
    if (payment.status === 'CREATED' && minutesSinceCreation > 1 && hasSwishPaymentId) {
      try {
        logDebug(`Payment is still in CREATED state after ${minutesSinceCreation.toFixed(1)} minutes. Checking with Swish API.`);
        
        const swishService = SwishService.getInstance();
        const swishResponse = await swishService.getPaymentStatus(payment.swish_payment_id);
        
        logDebug('Direct Swish status check response:', swishResponse);
        
        if (swishResponse.success && swishResponse.data?.status) {
          swishStatus = swishResponse.data.status;
          
          // Om status från Swish är PAID, uppdatera vår status i databasen
          if (swishStatus === 'PAID' || swishStatus === 'DECLINED' || swishStatus === 'ERROR') {
            logDebug(`Updating payment status from ${payment.status} to ${swishStatus} based on direct Swish status check`);
            
            const { error: updateError } = await supabase
              .from('payments')
              .update({ 
                status: swishStatus,
                metadata: {
                  ...payment.metadata,
                  direct_status_check: {
                    checked_at: new Date().toISOString(),
                    result: swishResponse.data
                  }
                }
              })
              .eq('id', payment.id);
              
            if (updateError) {
              logError('Failed to update payment status from direct check:', updateError);
            } else {
              logDebug('Successfully updated payment status from direct check');
              payment.status = swishStatus;
            }
          }
        }
      } catch (swishCheckError) {
        logError('Error checking payment status directly with Swish:', swishCheckError);
        // Vi fortsätter med att returnera vår lokala status
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          created_at: payment.created_at,
          swish_payment_id: payment.swish_payment_id,
          callback_url: payment.swish_callback_url,
          direct_swish_status: swishStatus
        },
        booking: payment.bookings ? {
          reference: payment.bookings.reference,
          start_time: payment.bookings.start_time,
          end_time: payment.bookings.end_time
        } : null
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error in payment status endpoint:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payment status', details: errorMessage }, { status: 500 });
  }
} 