import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching all art orders');
    
    // Fetch all art orders with product information
    const { data: orders, error: ordersError } = await supabase
      .from('art_orders')
      .select(`
        *,
        product:products(*)
      `)
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('Error fetching art orders:', ordersError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch orders information' 
      }, { status: 500 });
    }
    
    // Format the orders for response
    const formattedOrders = orders.map(order => ({
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
      product: order.product ? {
        id: order.product.id,
        title: order.product.title,
        price: order.product.price,
        description: order.product.description || '',
        image: order.product.image
      } : null
    }));
    
    console.log(`Successfully fetched ${formattedOrders.length} art orders`);
    
    return NextResponse.json({
      success: true,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Unhandled error in GET all art orders:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 