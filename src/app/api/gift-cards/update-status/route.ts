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
    
    // Map frontend status to database status
    let dbStatus = status;
    if (status === 'redeemed') {
      dbStatus = 'used';
    }
    
    // Validate status value
    if (!['active', 'used', 'expired', 'cancelled'].includes(dbStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .update({ status: dbStatus })
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
    
    // Map database status back to frontend status in response
    const responseData = data[0];
    if (responseData && responseData.status === 'used') {
      responseData.status = 'redeemed';
    }
    
    return NextResponse.json({
      message: 'Gift card status updated successfully',
      data: responseData,
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