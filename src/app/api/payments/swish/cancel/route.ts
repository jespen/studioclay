import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SwishService } from '@/services/swish/swishService';
import { logDebug, logError } from '@/lib/logging';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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

    if (fetchError || !payment) {
      logError('Error fetching payment:', fetchError);
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

    // Update payment status in database first
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'DECLINED',
        updated_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        cancelled_from: cancelledFrom
      })
      .eq('payment_reference', paymentReference);

    if (updateError) {
      logError('Error updating payment status:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update payment status' },
        { status: 500 }
      );
    }

    // Cancel payment in Swish if we have a Swish payment ID
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
        // We don't fail the request here since we've already updated our database
        // Just log the error and continue
      }
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
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 