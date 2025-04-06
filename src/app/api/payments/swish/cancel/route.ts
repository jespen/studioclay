import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logDebug, logError } from '@/lib/logging';
import { SwishService } from '@/services/swish/swishService';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { paymentReference } = await request.json();

    if (!paymentReference) {
      return NextResponse.json({
        success: false,
        error: 'Payment reference is required'
      }, { status: 400 });
    }

    logDebug('Cancelling payment:', { paymentReference });

    // 1. Get the payment details from database
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', paymentReference)
      .single();

    if (fetchError || !payment) {
      logError('Error fetching payment:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    // 2. Only allow cancellation if payment is in CREATED state
    if (payment.status !== 'CREATED') {
      return NextResponse.json({
        success: false,
        error: `Cannot cancel payment in ${payment.status} state`
      }, { status: 400 });
    }

    // 3. Update payment status to DECLINED in our database
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'DECLINED',
        metadata: {
          ...payment.metadata,
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'user'
        }
      })
      .eq('payment_reference', paymentReference);

    if (updateError) {
      logError('Error updating payment status:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update payment status'
      }, { status: 500 });
    }

    // 4. Try to cancel the Swish payment request if we have a Swish payment ID
    if (payment.swish_payment_id) {
      try {
        const swishService = SwishService.getInstance();
        await swishService.cancelPayment(payment.swish_payment_id);
      } catch (swishError) {
        // Log the error but don't fail the request - the payment is already marked as DECLINED in our system
        logError('Error cancelling Swish payment:', swishError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'DECLINED',
        message: 'Payment cancelled successfully'
      }
    });

  } catch (error) {
    logError('Error in cancel payment handler:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 