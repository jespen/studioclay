import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Payment, PaymentStatus } from '@/types/payment';
import { logDebug } from '@/lib/logging';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { reference: string } }
) {
  try {
    const { reference } = params;
    
    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    logDebug('Checking status for payment reference:', reference);

    // Get payment information from our database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, bookings(*)')
      .eq('payment_reference', reference)
      .single();

    if (paymentError) {
      logDebug('Error fetching payment:', paymentError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payment status' },
        { status: 500 }
      );
    }

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Return payment status and any associated booking
    return NextResponse.json({
      success: true,
      data: {
        payment: {
          reference: payment.payment_reference,
          status: payment.status,
          amount: payment.amount,
          metadata: payment.metadata
        },
        booking: payment.bookings?.[0] || null
      }
    });
  } catch (error) {
    logDebug('Error in payment status check:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 