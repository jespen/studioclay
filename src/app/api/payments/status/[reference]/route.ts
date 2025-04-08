import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logDebug, logError } from "@/lib/logging";
import { SwishService } from "@/services/swish/swishService";
import { getValidPaymentStatus, PAYMENT_STATUSES } from "@/constants/statusCodes";

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

    console.log(`Status API: Checking payment status for reference: ${reference}`);
    
    // Find the payment by reference
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', reference)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
    
    if (!payment) {
      console.log(`Status API: No payment found for reference: ${reference}`);
      return NextResponse.json({
        success: true,
        debug: { message: "Payment not found" },
        data: { 
          status: PAYMENT_STATUSES.CREATED,
          callback_received: false 
        }
      });
    }

    // Log the actual status from database
    console.log(`Status API: Found payment status=${payment.status} for reference=${reference}`);
    
    // Get associated booking if exists
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .or(`booking_id.eq.${payment.id},id.eq.${payment.booking_id}`)
      .maybeSingle();
    
    // Return the actual status from the database
    return NextResponse.json({
      success: true,
      status: payment.status,
      debug: { 
        payment_id: payment.id,
        payment_reference: payment.payment_reference,
        swish_payment_id: payment.swish_payment_id,
        status: payment.status,
        found_method: "payment_reference",
        booking_found: !!booking
      },
      data: {
        id: payment.id,
        status: payment.status,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        callback_received: payment.status !== PAYMENT_STATUSES.CREATED,
        payment_reference: payment.payment_reference,
        swish_payment_id: payment.swish_payment_id,
        booking_id: payment.booking_id || booking?.id,
        booking_reference: booking?.booking_reference,
        product_type: payment.product_type,
        product_id: payment.product_id,
        payment_method: payment.payment_method,
        amount: payment.amount
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