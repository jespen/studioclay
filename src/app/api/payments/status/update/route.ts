import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Updates a payment status by reference
 * This is mainly used for test purposes
 */
export async function POST(request: Request) {
  console.log('=== /api/payments/status/update POST handler called ===');
  
  try {
    const data = await request.json();
    const { reference, status } = data;
    
    if (!reference || !status) {
      console.error('Missing required data:', { reference, status });
      return NextResponse.json(
        { success: false, error: 'Missing reference or status' },
        { status: 400 }
      );
    }
    
    console.log('Updating payment status:', { reference, status });
    
    // Get payment by reference
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', reference)
      .single();
    
    if (paymentError || !paymentData) {
      console.error('Error finding payment:', paymentError);
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    console.log('Found payment:', {
      id: paymentData.id,
      currentStatus: paymentData.status,
      newStatus: status
    });
    
    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', paymentData.id);
    
    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update payment' },
        { status: 500 }
      );
    }
    
    console.log('Payment status updated successfully');
    
    // If status is PAID, also trigger the callback endpoint
    if (status === 'PAID') {
      try {
        console.log('Triggering callback for PAID payment');
        
        const callbackResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payeePaymentReference: reference,
            status: 'PAID',
            amount: paymentData.amount.toString(),
            currency: 'SEK'
          })
        });
        
        if (!callbackResponse.ok) {
          console.error('Error triggering callback:', await callbackResponse.text());
        } else {
          console.log('Callback triggered successfully');
        }
      } catch (callbackError) {
        console.error('Error triggering callback:', callbackError);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payment status updated' 
    });
    
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 