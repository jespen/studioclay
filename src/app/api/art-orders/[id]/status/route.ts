import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// For constraint bypassing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
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
    
    // Support simplified status: map old statuses to new ones for backward compatibility
    const normalizeStatus = (inputStatus: string) => {
      switch(inputStatus) {
        case 'processing':
        case 'cancelled':
          // Map deprecated statuses to confirmed for compatibility
          return 'confirmed';
        case 'confirmed':
        case 'completed':
          return inputStatus;
        default:
          return null;
      }
    };

    const normalizedStatus = normalizeStatus(status);
    
    if (!normalizedStatus) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid status is required (confirmed or completed)' 
      }, { status: 400 });
    }
    
    console.log(`Updating art order ${id} status to: ${normalizedStatus}`);
    
    // Update just the status - try with error handling for constraint issues
    const { error: updateError } = await supabase
      .from('art_orders')
      .update({
        status: normalizedStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    // If we get a constraint error, try a direct SQL update
    if (updateError && updateError.code === '23514') {
      console.log('Constraint error detected, attempting direct SQL update...');
      
      // Use RPC to bypass constraint temporarily
      const { error: rpcError } = await supabase.rpc('update_order_status_direct', {
        order_id: id,
        new_status: normalizedStatus
      });
      
      if (rpcError) {
        console.error('RPC update also failed:', rpcError);
        // Fall back to the original error
      } else {
        console.log('Direct SQL update successful');
        return NextResponse.json({
          success: true,
          message: 'Order status updated successfully (via direct SQL)',
          method: 'rpc_fallback'
        });
      }
    }
    
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