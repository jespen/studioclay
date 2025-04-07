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
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    console.log(`Checking payment status for reference: ${reference}`);

    // First try to find payment by payment_reference
    let { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', reference)
      .single();

    // If not found, try with swish_payment_id
    if (!payment && !error) {
      const { data: payment2, error: error2 } = await supabase
        .from('payments')
        .select('*')
        .eq('swish_payment_id', reference)
        .single();
      
      payment = payment2;
      error = error2;
    }

    if (error) {
      console.error('Error fetching payment:', error);
      
      // If we simply didn't find a payment, that's different than a real error
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          debug: { error: 'Payment not found yet', code: error.code },
          data: { status: 'PENDING', callback_received: false }
        }, { status: 200 });
      }
      
      return NextResponse.json({
        success: false,
        error: error.message,
        debug: { error_details: error }
      }, { status: 500 });
    }

    if (!payment) {
      return NextResponse.json({
        success: true,
        debug: { message: 'Payment not found' },
        data: { status: 'UNKNOWN', callback_received: false }
      }, { status: 200 });
    }

    // Find booking by looking for bookings with this payment_id or reference
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .or(`booking_id.eq.${payment.id},booking_reference.ilike.%${payment.payment_reference}%`)
      .limit(1)
      .maybeSingle();

    // Return payment details in the new expected format
    return NextResponse.json({
      success: true,
      status: payment.status,
      debug: { 
        search_reference: reference,
        payment_id: payment.id,
        booking_found: !!booking 
      },
      data: {
        id: payment.id,
        status: payment.status,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        callback_received: payment.status !== 'CREATED',
        payment_reference: payment.payment_reference,
        swish_payment_id: payment.swish_payment_id,
        booking_id: payment.booking_id || booking?.id,
        booking_reference: booking?.booking_reference
      }
    });

  } catch (error) {
    console.error('Error in status check:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      debug: { error_details: error }
    }, { status: 500 });
  }
} 