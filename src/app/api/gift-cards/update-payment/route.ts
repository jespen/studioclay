import { NextRequest, NextResponse } from 'next/server';

// Import the proper supabaseAdmin instance
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Removed static export flag

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isPaid } = body;
    
    if (!id || isPaid === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id or isPaid' },
        { status: 400 }
      );
    }
    
    console.log(`API: Updating gift card ${id} payment status to ${isPaid ? 'paid' : 'unpaid'}`);
    
    // Convert to boolean if needed
    const isPaidBoolean = Boolean(isPaid);
    
    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .update({ is_paid: isPaidBoolean })
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('Error in update-payment API:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('Gift card payment status updated successfully:', id, isPaidBoolean);
    
    return NextResponse.json({
      message: 'Gift card payment status updated successfully',
      data: data[0],
      status: 'success'
    });
  } catch (error) {
    console.error('Error in update-payment API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 