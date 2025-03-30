import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// PATCH to update only the status of an order
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order ID is required' 
      }, { status: 400 });
    }
    
    const { status } = await request.json();
    
    if (!status || !['confirmed', 'processing', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid status is required (confirmed, processing, completed, cancelled)' 
      }, { status: 400 });
    }
    
    console.log(`Updating art order ${id} status to: ${status}`);
    
    // Update just the status
    const { error: updateError } = await supabase
      .from('art_orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error updating art order status:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update order status' 
      }, { status: 500 });
    }
    
    console.log('Successfully updated art order status');
    
    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Unhandled error in PATCH art order status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 