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
    
    // SUPERMEGASIMPEL VERSION - söker betalningar på ALLA sätt samtidigt
    
    // 1. Hämta ALLA betalningar som kan matcha på NÅGOT sätt
    const { data: allPayments, error: allError } = await supabase
      .from('payments')
      .select('*')
      .or(`payment_reference.eq.${reference},swish_payment_id.eq.${reference},id.eq.${reference}`);
    
    console.log(`Status API: Search for ${reference} found ${allPayments?.length || 0} possible matches`);
    
    // Om vi hittade något, kolla om någon betalning är PAID
    if (allPayments && allPayments.length > 0) {
      // Sortera betalningar så PAID kommer först
      const sortedPayments = [...allPayments].sort((a, b) => {
        if (a.status === 'PAID') return -1;
        if (b.status === 'PAID') return 1;
        return 0;
      });
      
      const payment = sortedPayments[0];
      console.log(`Status API: Using payment with ID=${payment.id}, status=${payment.status}`);
      
      // Hämta bokning om det finns
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .or(`booking_id.eq.${payment.id},id.eq.${payment.booking_id}`)
        .maybeSingle();
      
      // Bygg svar
      return NextResponse.json({
        success: true,
        status: payment.status,
        debug: { 
          payment_id: payment.id,
          payment_reference: payment.payment_reference,
          swish_payment_id: payment.swish_payment_id,
          status: payment.status,
          found_method: "direct_search",
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
    }
    
    // 2. Fallback - sök efter ALLA som har status="PAID" från senaste 10 min
    console.log("Status API: No exact match found, looking for recent PAID payments");
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: recentPaid } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'PAID')
      .gt('updated_at', tenMinutesAgo)
      .order('updated_at', { ascending: false });
    
    if (recentPaid && recentPaid.length > 0) {
      console.log(`Status API: Found ${recentPaid.length} recent PAID payments`);
      const payment = recentPaid[0]; // Använd den senaste
      
      // Hämta bokning om det finns
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .or(`booking_id.eq.${payment.id},id.eq.${payment.booking_id}`)
        .maybeSingle();
      
      // Bygg svar
      return NextResponse.json({
        success: true,
        status: payment.status,
        debug: { 
          payment_id: payment.id,
          payment_reference: payment.payment_reference,
          swish_payment_id: payment.swish_payment_id,
          status: payment.status,
          found_method: "recent_paid_search",
          booking_found: !!booking
        },
        data: {
          id: payment.id,
          status: payment.status,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          callback_received: true,
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
    }
    
    // Ingen betalning hittades
    console.log(`Status API: No payments found at all for reference: ${reference}`);
    return NextResponse.json({
      success: true,
      debug: { message: "No payment found matching the reference" },
      data: { 
        status: PAYMENT_STATUSES.CREATED, 
        callback_received: false 
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in status check:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      debug: { error_details: error }
    }, { status: 500 });
  }
} 