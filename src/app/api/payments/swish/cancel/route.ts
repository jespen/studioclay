import { NextResponse } from 'next/server';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { SwishService } from '@/services/swish/swishService';
import { logDebug, logError } from '@/lib/logging';

// Initialize environment variables with detailed logging
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Log environment variable status
logDebug('Environment check in cancel endpoint', { 
  hasSupabaseUrl: !!supabaseUrl,
  supabaseUrlLength: supabaseUrl?.length || 0,
  hasServiceKey: !!supabaseServiceKey,
  serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 5) + '...' : 'not-set',
  nodeEnv: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

if (!supabaseUrl || !supabaseServiceKey) {
  logError('Missing required environment variables for Supabase in cancel endpoint');
}

// Create Supabase client and log its creation
const supabase = createClient(supabaseUrl, supabaseServiceKey);
logDebug('Supabase client created in cancel endpoint');

// Helper function to detect specific database constraint errors
function isConstraintError(error: PostgrestError, constraintName: string): boolean {
  return error.code === '23514' && error.message.includes(constraintName);
}

export async function POST(request: Request) {
  const requestId = `cancel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  logDebug(`[${requestId}] Cancel payment request received`);
  
  try {
    // Parse request body
    const requestBody = await request.json();
    const { paymentReference, cancelledBy, cancelledFrom } = requestBody;
    
    logDebug(`[${requestId}] Request body parsed`, { 
      paymentReference, 
      cancelledBy, 
      cancelledFrom,
      hasPaymentReference: !!paymentReference
    });
    
    if (!paymentReference) {
      logError(`[${requestId}] Payment reference is missing in request`);
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    logDebug(`[${requestId}] Cancelling payment`, { paymentReference, cancelledBy, cancelledFrom });

    // Get payment details from database
    logDebug(`[${requestId}] Fetching payment details from database`, { paymentReference });
    const fetchStart = Date.now();
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', paymentReference)
      .single();
    const fetchDuration = Date.now() - fetchStart;

    logDebug(`[${requestId}] Fetch payment result in ${fetchDuration}ms`, { 
      success: !fetchError, 
      hasPayment: !!payment,
      errorCode: fetchError?.code,
      errorMessage: fetchError?.message,
      paymentId: payment?.id,
      paymentStatus: payment?.status
    });

    if (fetchError) {
      logError(`[${requestId}] Error fetching payment:`, fetchError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database error when fetching payment', 
          details: fetchError.message,
          code: fetchError.code
        },
        { status: 500 }
      );
    }

    if (!payment) {
      logError(`[${requestId}] Payment not found with reference: ${paymentReference}`);
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    logDebug(`[${requestId}] Found payment`, { 
      id: payment.id, 
      status: payment.status,
      method: payment.payment_method,
      hasSwishId: !!payment.swish_payment_id,
      swishId: payment.swish_payment_id,
      productType: payment.product_type
    });

    // Only allow cancellation if payment is in CREATED state
    if (payment.status !== 'CREATED') {
      logDebug(`[${requestId}] Cannot cancel payment - invalid status`, { 
        currentStatus: payment.status,
        paymentReference 
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment cannot be cancelled - invalid status',
          status: payment.status
        },
        { status: 400 }
      );
    }

    // Try to cancel in Swish first if we have a Swish payment ID
    let swishCancelled = false;
    let swishError = null;
    
    if (payment.swish_payment_id) {
      try {
        logDebug(`[${requestId}] Attempting to cancel payment in Swish`, {
          swishPaymentId: payment.swish_payment_id
        });
        
        const swishService = SwishService.getInstance();
        const swishStart = Date.now();
        
        // Wrap the cancelPayment call in a Promise.race with a timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Swish cancellation timed out after 8 seconds')), 8000);
        });
        
        await Promise.race([
          swishService.cancelPayment(payment.swish_payment_id),
          timeoutPromise
        ]);
        
        const swishDuration = Date.now() - swishStart;
        
        logDebug(`[${requestId}] Successfully cancelled payment in Swish in ${swishDuration}ms`, { 
          paymentReference,
          swishPaymentId: payment.swish_payment_id 
        });
        swishCancelled = true;
      } catch (error) {
        swishError = error;
        logError(`[${requestId}] Error cancelling payment in Swish:`, error);
        logDebug(`[${requestId}] Will continue to update database despite Swish API error`);
        // Continue to update our database even if Swish call fails
      }
    } else {
      logDebug(`[${requestId}] No Swish payment ID available, skipping Swish cancellation`);
    }

    // Prepare metadata for update
    const metadataUpdate = {
      ...payment.metadata,
      cancellation: {
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        cancelled_from: cancelledFrom,
        previous_status: payment.status,
        swish_cancelled: swishCancelled,
        swish_error: swishError ? {
          message: swishError instanceof Error ? swishError.message : 'Unknown error',
          name: swishError instanceof Error ? swishError.name : 'UnknownError',
          time: new Date().toISOString()
        } : null
      }
    };

    // Update payment status in database
    logDebug(`[${requestId}] Updating payment status in database`, { 
      paymentId: payment.id,
      fromStatus: payment.status,
      toStatus: 'DECLINED'
    });
    
    const updateStart = Date.now();
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'DECLINED',
        updated_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        cancelled_from: cancelledFrom,
        metadata: metadataUpdate
      })
      .eq('id', payment.id);  // Using the ID instead of payment_reference for more precise matching
    const updateDuration = Date.now() - updateStart;

    logDebug(`[${requestId}] Update payment status result in ${updateDuration}ms`, { 
      success: !updateError,
      errorCode: updateError?.code,
      errorMessage: updateError?.message,
      paymentReference
    });

    if (updateError) {
      logError(`[${requestId}] Error updating payment status:`, updateError);
      
      // If there's an error but the Swish cancellation succeeded,
      // we should still return success to the client
      if (swishCancelled) {
        logDebug(`[${requestId}] Returning success despite database error because Swish cancellation succeeded`);
        return NextResponse.json({ 
          success: true,
          message: 'Payment was cancelled in Swish, but database update failed',
          details: {
            swishCancelled: true,
            databaseUpdated: false,
            error: updateError.message
          },
          data: { 
            paymentReference,
            status: 'DECLINED'
          }
        });
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database error when updating payment',
          details: updateError.message,
          code: updateError.code,
          hint: updateError.hint,
          swishAttempted: payment.swish_payment_id ? true : false,
          swishCancelled
        },
        { status: 500 }
      );
    }

    logDebug(`[${requestId}] Payment cancelled successfully`, { 
      paymentReference,
      newStatus: 'DECLINED',
      swishCancelled
    });

    return NextResponse.json({ 
      success: true,
      message: 'Payment cancelled successfully',
      details: {
        swishCancelled,
        databaseUpdated: true
      },
      data: { 
        paymentReference,
        status: 'DECLINED'
      }
    });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logError(`[${requestId}] Unexpected error in cancel payment endpoint:`, error);
    logDebug(`[${requestId}] Error details:`, {
      message: errorMessage,
      stack: errorStack,
      name: error?.name,
      code: error?.code
    });
    
    // Always return a meaningful response, even in case of unhandled exceptions
    return NextResponse.json(
      { 
        success: false, 
        error: 'Server error during payment cancellation',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        requestId
      },
      { status: 500 }
    );
  }
} 