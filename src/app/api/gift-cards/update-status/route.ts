import { NextRequest, NextResponse } from 'next/server';

// Import the proper supabaseAdmin instance
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Removed static export flag

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id or status' },
        { status: 400 }
      );
    }
    
    console.log(`API: Updating gift card ${id} status to ${status}`);
    
    // Validate status value
    if (!['active', 'redeemed', 'expired', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .update({ status })
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('Error in update-status API:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('Gift card status updated successfully:', id, status);
    
    return NextResponse.json({
      message: 'Gift card status updated successfully',
      data: data[0],
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