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
    
    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    console.log(`Checking payment status for reference: ${reference}`);

    // First try to find payment by payment_reference
    let { data: payment, error } = await supabase
      .from('payments')
      .select('id, status, payment_reference, swish_payment_id')
      .eq('payment_reference', reference)
      .single();

    // If not found, try with swish_payment_id
    if (!payment && !error) {
      const { data: payment2, error: error2 } = await supabase
        .from('payments')
        .select('id, status, payment_reference, swish_payment_id')
        .eq('swish_payment_id', reference)
        .single();
      
      payment = payment2;
      error = error2;
    }

    if (error) {
      console.error('Error fetching payment:', error);
      
      // If we simply didn't find a payment, that's different than a real error
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { status: 'PENDING', message: 'Payment not found yet' },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!payment) {
      return NextResponse.json(
        { status: 'UNKNOWN', message: 'Payment not found' },
        { status: 200 }
      );
    }

    // Check if there's a booking for this payment
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, reference')
      .eq('payment_id', payment.id)
      .single();

    return NextResponse.json({
      status: payment.status,
      paymentId: payment.id,
      paymentReference: payment.payment_reference,
      swishPaymentId: payment.swish_payment_id,
      bookingId: booking?.id,
      bookingReference: booking?.reference
    });

  } catch (error) {
    console.error('Error in status check:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 'ERROR' },
      { status: 500 }
    );
  }
} 