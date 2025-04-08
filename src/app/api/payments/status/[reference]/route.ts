import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PAYMENT_STATUSES } from '@/constants/statusCodes';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  const reference = params.reference;
  
  if (!reference) {
    console.log('🚫 Status API: Missing payment reference');
    return NextResponse.json(
      { success: false, message: 'Payment reference required' },
      { status: 400 }
    );
  }

  console.log(`🔍 Status API: Looking for payment with reference: ${reference}`);

  try {
    // Search for payment using multiple possible identifiers
    const { data: possiblePayments, error } = await supabase
      .from('payments')
      .select('*, booking:bookings(*)')
      .or(`payment_reference.eq.${reference},swish_payment_id.eq.${reference},id.eq.${reference}`);

    if (error) {
      console.error('❌ Status API DB Error:', error);
      return NextResponse.json(
        { success: false, message: 'Database error when searching for payment', error: error.message },
        { status: 500 }
      );
    }

    console.log(`📊 Status API: Found ${possiblePayments?.length || 0} possible matching payments`);

    // If we found matching payments, find the one with priority status (PAID)
    if (possiblePayments && possiblePayments.length > 0) {
      // Sort payments to prioritize PAID status
      const sortedPayments = [...possiblePayments].sort((a, b) => {
        if (a.status === PAYMENT_STATUSES.PAID) return -1;
        if (b.status === PAYMENT_STATUSES.PAID) return 1;
        return 0;
      });

      const payment = sortedPayments[0];
      console.log(`✅ Status API: Found payment - status: ${payment.status}, id: ${payment.id}`);

      return NextResponse.json({
        success: true,
        message: `Payment found with status: ${payment.status}`,
        status: payment.status,
        data: {
          paymentId: payment.id,
          status: payment.status,
          booking: payment.booking ? {
            id: payment.booking.id,
            reference: payment.booking.booking_reference
          } : null,
          metadata: payment.metadata
        }
      });
    }

    // If no exact match found, check if there's any recent PAID payment
    // This is a fallback mechanism for cases where reference might not match exactly
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentPaidPayments, error: recentError } = await supabase
      .from('payments')
      .select('id, payment_reference, swish_payment_id, status, updated_at')
      .eq('status', PAYMENT_STATUSES.PAID)
      .gt('updated_at', tenMinutesAgo)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Status API Recent Payments Error:', recentError);
    }

    if (recentPaidPayments && recentPaidPayments.length > 0) {
      console.log(`⚠️ Status API: No exact match found but detected ${recentPaidPayments.length} recent PAID payments`);
      
      // Include info about these payments in the response for debugging
      return NextResponse.json({
        success: false,
        message: 'Payment not found yet, but recent paid payments detected',
        recentPaidPayments: recentPaidPayments.map(p => ({
          id: p.id,
          reference: p.payment_reference,
          swishId: p.swish_payment_id,
          status: p.status,
          updated_at: p.updated_at
        }))
      });
    }

    console.log(`⚠️ Status API: No payment found with reference: ${reference}`);
    return NextResponse.json({
      success: false,
      message: 'Payment not found yet'
    });
  } catch (error) {
    console.error('❌ Status API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check payment status', error: String(error) },
      { status: 500 }
    );
  }
} 