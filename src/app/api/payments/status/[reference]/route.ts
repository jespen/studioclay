import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logDebug, logError } from "@/lib/logging";

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
      bookingReference: payment.bookings?.reference,
      hasBooking: !!payment.bookings
    });

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          created_at: payment.created_at
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