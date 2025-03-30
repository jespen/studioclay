import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const { reference } = params;
    
    if (!reference) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order reference is required' 
      }, { status: 400 });
    }
    
    console.log('Fetching art order with reference:', reference);
    
    // Fetch art order with product information
    const { data: order, error: orderError } = await supabase
      .from('art_orders')
      .select(`
        *,
        product:products(*)
      `)
      .eq('order_reference', reference)
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
    
    // Format response data for the confirmation page
    const responseData = {
      success: true,
      order: {
        id: order.id,
        reference: order.order_reference,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        invoice_number: order.invoice_number,
        created_at: order.created_at,
        updated_at: order.updated_at,
        amount: order.total_price,
        currency: order.currency
      },
      product: order.product ? {
        id: order.product.id,
        title: order.product.title,
        price: order.product.price,
        description: order.product.description || '',
        image: order.product.image
      } : null,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone
      },
      meta: order.metadata || {}
    };
    
    console.log('Successfully fetched art order data:', responseData);
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Unhandled error in GET art order:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 