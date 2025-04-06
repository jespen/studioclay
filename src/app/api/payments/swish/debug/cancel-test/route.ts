import { NextResponse } from 'next/server';
import { SwishService } from '@/services/swish/swishService';
import { logDebug, logError } from '@/lib/logging';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const logId = `cancel-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  try {
    logDebug(`[${logId}] Cancel test endpoint called`);
    
    // Get params and required swishId
    const url = new URL(request.url);
    const paymentIdOrReference = url.searchParams.get('id');
    
    if (!paymentIdOrReference) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing payment ID or reference parameter "id"' 
      }, { status: 400 });
    }
    
    logDebug(`[${logId}] Testing cancellation of payment`, { paymentIdOrReference });
    
    // Get payment details if reference provided
    let swishId = paymentIdOrReference;
    let paymentData = null;
    
    if (paymentIdOrReference.includes('-')) {
      // Looks like a payment reference, let's fetch the Swish ID
      logDebug(`[${logId}] Input looks like payment reference, fetching from database`, { paymentIdOrReference });
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_reference', paymentIdOrReference)
        .single();
        
      if (error) {
        logError(`[${logId}] Database error fetching payment`, error);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch payment from database',
          details: error.message
        }, { status: 500 });
      }
      
      if (!data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Payment not found' 
        }, { status: 404 });
      }
      
      paymentData = data;
      
      if (!data.swish_payment_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Payment does not have a Swish ID',
          details: data
        }, { status: 400 });
      }
      
      swishId = data.swish_payment_id;
      logDebug(`[${logId}] Found Swish ID from payment reference`, { 
        paymentReference: paymentIdOrReference,
        swishId,
        paymentStatus: data.status
      });
    }
    
    // Now attempt the cancellation
    try {
      const swishService = SwishService.getInstance();
      logDebug(`[${logId}] Initialized SwishService, attempting cancellation`, { 
        swishId, 
        isTestMode: swishService.isTestMode() 
      });
      
      // Direct cancellation (no ID resolution)
      await swishService.cancelPayment(swishId, { 
        skipIdCheck: true,
        timeout: 15000  // 15 seconds timeout
      });
      
      logDebug(`[${logId}] Cancellation successful!`);
      
      // If we have payment data, update the status in the database
      if (paymentData) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({ 
            status: 'DECLINED',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentData.id);
          
        if (updateError) {
          logError(`[${logId}] Failed to update payment status in database`, updateError);
        } else {
          logDebug(`[${logId}] Updated payment status to DECLINED in database`);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Payment cancelled successfully',
        paymentId: swishId,
        paymentReference: paymentIdOrReference,
        databaseUpdated: paymentData !== null
      });
    } catch (error: any) {
      logError(`[${logId}] Error during cancellation`, error);
      
      return NextResponse.json({
        success: false,
        error: 'Cancellation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        paymentId: swishId,
        paymentReference: paymentIdOrReference
      }, { status: 500 });
    }
  } catch (error: any) {
    logError(`[${logId}] Unexpected error in cancel-test endpoint`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 