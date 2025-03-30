import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// GET a specific order by ID
export async function GET(
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
    
    console.log('Fetching art order with ID:', id);
    
    // Fetch art order with product information
    const { data: order, error: orderError } = await supabase
      .from('art_orders')
      .select(`
        *,
        product:products(*)
      `)
      .eq('id', id)
      .single();
    
    if (orderError) {
      console.error('Error fetching art order:', orderError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch order information' 
      }, { status: 500 });
    }
    
    if (!order) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order not found' 
      }, { status: 404 });
    }
    
    console.log('Successfully fetched art order data');
    
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_reference: order.order_reference,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        created_at: order.created_at,
        updated_at: order.updated_at,
        total_price: order.total_price,
        currency: order.currency,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        invoice_number: order.invoice_number,
        product: order.product
      }
    });
  } catch (error) {
    console.error('Unhandled error in GET art order:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// PUT to update an order
export async function PUT(
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
    
    const updatedOrder = await request.json();
    console.log('Updating art order with ID:', id, updatedOrder);
    
    // Update the art order
    const { error: updateError } = await supabase
      .from('art_orders')
      .update({
        customer_name: updatedOrder.customer_name,
        customer_email: updatedOrder.customer_email,
        customer_phone: updatedOrder.customer_phone,
        status: updatedOrder.status,
        payment_status: updatedOrder.payment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error updating art order:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update order' 
      }, { status: 500 });
    }
    
    console.log('Successfully updated art order');
    
    return NextResponse.json({
      success: true,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Unhandled error in PUT art order:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE an order
export async function DELETE(
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
    
    console.log('Deleting art order with ID:', id);
    
    // Delete the art order
    const { error: deleteError } = await supabase
      .from('art_orders')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting art order:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete order' 
      }, { status: 500 });
    }
    
    console.log('Successfully deleted art order');
    
    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Unhandled error in DELETE art order:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 