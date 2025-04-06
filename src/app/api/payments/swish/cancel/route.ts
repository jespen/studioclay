import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SwishService } from '@/services/swish/swishService';
import { logDebug, logError } from '@/lib/logging';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  logError('Missing required environment variables for Supabase');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { paymentReference, cancelledBy, cancelledFrom } = await request.json();
    
    if (!paymentReference) {
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    logDebug('Cancelling payment', { paymentReference, cancelledBy, cancelledFrom });

    // Get payment details from database
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', paymentReference)
      .single();

    if (fetchError) {
      logError('Error fetching payment:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Database error when fetching payment', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation if payment is in CREATED state
    if (payment.status !== 'CREATED') {
      logDebug('Cannot cancel payment - invalid status', { 
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
    if (payment.swish_payment_id) {
      try {
        const swishService = SwishService.getInstance();
        await swishService.cancelPayment(payment.swish_payment_id);
        logDebug('Successfully cancelled payment in Swish', { 
          paymentReference,
          swishPaymentId: payment.swish_payment_id 
        });
      } catch (swishError) {
        logError('Error cancelling payment in Swish:', swishError);
        // We continue to update our database even if Swish call fails
        // The callback from Swish will eventually update the status if needed
      }
    }

    // Update payment status in database
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'DECLINED',
        updated_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        cancelled_from: cancelledFrom,
        metadata: {
          ...payment.metadata,
          cancellation: {
            cancelled_at: new Date().toISOString(),
            cancelled_by: cancelledBy,
            cancelled_from: cancelledFrom,
            previous_status: payment.status
          }
        }
      })
      .eq('payment_reference', paymentReference);

    if (updateError) {
      logError('Error updating payment status:', updateError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database error when updating payment',
          details: updateError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Payment cancelled successfully',
      data: { 
        paymentReference,
        status: 'DECLINED'
      }
    });

  } catch (error) {
    logError('Unexpected error in cancel payment endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 