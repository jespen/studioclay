import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { updatePaymentStatus } from '@/utils/admin/paymentUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, status } = body;
    
    if (!paymentId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: paymentId or status' },
        { status: 400 }
      );
    }
    
    console.log(`API: Updating payment ${paymentId} status to ${status}`);
    
    const success = await updatePaymentStatus(paymentId, status);
      
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      );
    }
    
    console.log('Payment status updated successfully:', paymentId, status);
    
    // Get the updated payment to return
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();
      
    if (error) {
      console.error('Error fetching updated payment:', error);
      // Still return success since the update worked
      return NextResponse.json({
        message: 'Payment status updated successfully',
        status: 'success'
      });
    }
    
    return NextResponse.json({
      message: 'Payment status updated successfully',
      data,
      status: 'success'
    });
  } catch (error) {
    console.error('Error in update-status API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 