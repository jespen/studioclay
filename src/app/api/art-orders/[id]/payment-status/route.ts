import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// PATCH to update only the payment status of an order
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
    
    const { payment_status } = await request.json();
    
    // Support simplified payment status: only CREATED and PAID
    const normalizePaymentStatus = (inputStatus: string) => {
      const status = inputStatus.toUpperCase();
      switch(status) {
        case 'PENDING':
        case 'ERROR':
        case 'CANCELLED':
          // Map deprecated statuses to CREATED for compatibility
          return 'CREATED';
        case 'CREATED':
        case 'PAID':
          return status;
        default:
          return null;
      }
    };

    const normalizedPaymentStatus = normalizePaymentStatus(payment_status);
    
    if (!normalizedPaymentStatus) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid payment status is required (CREATED or PAID)' 
      }, { status: 400 });
    }
    
    console.log(`Updating art order ${id} payment status to: ${normalizedPaymentStatus}`);
    
    // Update just the payment status
    const { error: updateError } = await supabase
      .from('art_orders')
      .update({
        payment_status: normalizedPaymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error updating art order payment status:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update order payment status' 
      }, { status: 500 });
    }
    
    console.log('Successfully updated art order payment status');
    
    return NextResponse.json({
      success: true,
      message: 'Order payment status updated successfully'
    });
  } catch (error) {
    console.error('Unhandled error in PATCH art order payment status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 