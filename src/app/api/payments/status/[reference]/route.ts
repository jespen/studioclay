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
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const bypassCache = request.nextUrl.searchParams.get('bypass_cache') === 'true';
    const forceCheck = request.nextUrl.searchParams.get('forceCheck') === 'true';
    
    logDebug(`[${requestId}] Fetching payment status for reference: ${reference}, bypassCache: ${bypassCache}`);
    
    if (!reference) {
      logError(`[${requestId}] Missing payment reference`);
      return NextResponse.json({ success: false, error: 'Missing payment reference' }, { status: 400 });
    }

    // Query the payments table for the payment with the given reference
    // Use a cache-busting method to ensure fresh data when needed
    const query = supabase
      .from('payments')
      .select('*, bookings(*)');
      
    // Använd header: 'no-cache' för att förhindra caching
    if (bypassCache) {
      // För Supabase v2 använder vi en alternativ metod eftersom .options() inte finns
      // Lägg till en random query parameter som ändras varje gång
      const noCacheQueryParam = `no_cache=${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*, bookings(*)')
        .eq('payment_reference', reference)
        .order('created_at', { ascending: false }) // Detta påverkar inte resultatet för single, men ändrar query
        .maybeSingle();
        
      if (paymentError) {
        logError(`[${requestId}] Error fetching payment data from database:`, paymentError);
        return NextResponse.json({ success: false, error: 'Failed to fetch payment data' }, { status: 500 });
      }
      
      return handlePayment(payment, paymentError, reference, requestId, request, bypassCache, forceCheck);
    } else {
      // Standardförfrågan utan cache-busting
      const { data: payment, error: paymentError } = await query
        .eq('payment_reference', reference)
        .maybeSingle();
        
      if (paymentError) {
        logError(`[${requestId}] Error fetching payment data from database:`, paymentError);
        return NextResponse.json({ success: false, error: 'Failed to fetch payment data' }, { status: 500 });
      }
      
      return handlePayment(payment, paymentError, reference, requestId, request, bypassCache, forceCheck);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error in payment status endpoint:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payment status', details: errorMessage }, { status: 500 });
  }
}

// Separera ut logiken för att hantera ett payment för att undvika kod-duplicering
async function handlePayment(payment: any, paymentError: any, reference: string, requestId: string, request: NextRequest, bypassCache: boolean, forceCheck: boolean) {
  // If no payment found with the given reference
  if (!payment) {
    logError(`[${requestId}] No payment found with reference: ${reference}`);
    return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
  }

  // Logga raw-data från databasen för felsökning
  logDebug(`[${requestId}] Raw payment data from database:`, { 
    id: payment.id,
    reference: reference, 
    status: payment.status,
    created_at: payment.created_at,
    updated_at: payment.updated_at,
    swish_payment_id: payment.swish_payment_id,
    hasCallbackData: !!payment.metadata?.swish_callback,
    callback_received_at: payment.metadata?.swish_callback?.received_at,
    dirtyStatusExists: !!payment.metadata?.dirty_status,
    bookingReference: payment.bookings?.reference
  });

  // Om betalningens status fortfarande är CREATED och det har gått längre tid än 30 sekunder,
  // och vi har ett Swish-betalnings-ID, kan vi försöka fråga Swish direkt om status
  const paymentCreatedAt = new Date(payment.created_at);
  const now = new Date();
  const secondsSinceCreation = (now.getTime() - paymentCreatedAt.getTime()) / 1000;
  const hasSwishPaymentId = payment.swish_payment_id && payment.swish_payment_id !== reference;

  let swishStatus = null;
  
  // Kontrollera med Swish API direkt om:
  // 1. Betalningen fortfarande har status CREATED
  // 2. Det har gått minst 30 sekunder sedan betalningen skapades
  // 3. Vi har ett Swish-betalnings-ID
  // 4. Om queryparametern forceCheck=true ingår i URL:en
  const shouldCheckWithSwish = 
    (payment.status === 'CREATED' && secondsSinceCreation > 30 && hasSwishPaymentId) || 
    (forceCheck && hasSwishPaymentId);
  
  if (shouldCheckWithSwish) {
    try {
      logDebug(`[${requestId}] Payment is still in CREATED state after ${(secondsSinceCreation / 60).toFixed(1)} minutes. Checking with Swish API. ForceCheck: ${forceCheck}`);
      
      const swishService = SwishService.getInstance();
      const swishResponse = await swishService.getPaymentStatus(payment.swish_payment_id);
      
      logDebug(`[${requestId}] Direct Swish status check response:`, swishResponse);
      
      if (swishResponse.success && swishResponse.data?.status) {
        swishStatus = swishResponse.data.status;
        
        // Om status från Swish är PAID, DECLINED eller ERROR, uppdatera vår status i databasen
        if (swishStatus === 'PAID' || swishStatus === 'DECLINED' || swishStatus === 'ERROR') {
          logDebug(`[${requestId}] Updating payment status from ${payment.status} to ${swishStatus} based on direct Swish status check`);
          
          const { error: updateError } = await supabase
            .from('payments')
            .update({ 
              status: swishStatus,
              metadata: {
                ...payment.metadata,
                direct_status_check: {
                  checked_at: new Date().toISOString(),
                  result: swishResponse.data
                },
                dirty_status: {
                  previous: payment.status,
                  new: swishStatus,
                  updated_at: new Date().toISOString(),
                  reason: 'direct_check'
                }
              }
            })
            .eq('id', payment.id);
            
          if (updateError) {
            logError(`[${requestId}] Failed to update payment status from direct check:`, updateError);
          } else {
            logDebug(`[${requestId}] Successfully updated payment status from direct check`);
            payment.status = swishStatus;
          }
        }
      }
    } catch (swishCheckError) {
      logError(`[${requestId}] Error checking payment status directly with Swish:`, swishCheckError);
      // Vi fortsätter med att returnera vår lokala status
    }
  }

  return NextResponse.json({
    success: true,
    debug: {
      requestId,
      timestamp: new Date().toISOString(),
      reference,
      bypassCache,
      forceCheck,
      secondsSinceCreation,
      hasSwishPaymentId,
      shouldCheckWithSwish
    },
    data: {
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        swish_payment_id: payment.swish_payment_id,
        callback_url: payment.swish_callback_url,
        direct_swish_status: swishStatus,
        callback_received: payment.metadata?.swish_callback ? true : false,
        callback_time: payment.metadata?.swish_callback?.received_at,
        callback_data: payment.metadata?.swish_callback?.data
      },
      booking: payment.bookings ? {
        reference: payment.bookings.reference,
        start_time: payment.bookings.start_time,
        end_time: payment.bookings.end_time
      } : null
    }
  });
} 