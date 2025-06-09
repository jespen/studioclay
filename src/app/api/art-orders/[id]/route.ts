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
    
    // First, fetch the current order to check for status changes
    const { data: currentOrder, error: fetchError } = await supabase
      .from('art_orders')
      .select('product_id, status, payment_status')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching current art order:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch current order' 
      }, { status: 500 });
    }
    
    if (!currentOrder) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order not found' 
      }, { status: 404 });
    }
    
    // Check if this is a status change that affects stock
    const wasOrderPaid = currentOrder.payment_status === 'PAID' || currentOrder.status === 'confirmed';
    const willOrderBePaid = updatedOrder.payment_status === 'PAID' || updatedOrder.status === 'confirmed';
    const isOrderBeingCancelled = updatedOrder.status === 'cancelled' || updatedOrder.payment_status === 'CANCELLED';
    
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
    
    // Handle stock changes based on status transitions
    if (wasOrderPaid && (isOrderBeingCancelled || !willOrderBePaid)) {
      // Order was paid/confirmed but is now being cancelled or marked as unpaid
      // Restore stock
      try {
        console.log('Restoring stock due to order status change:', currentOrder.product_id);
        
        const { data: productData, error: productFetchError } = await supabase
          .from('products')
          .select('stock_quantity, in_stock')
          .eq('id', currentOrder.product_id)
          .single();
        
        if (productFetchError) {
          console.warn('Failed to fetch product data for stock restoration:', productFetchError);
        } else if (productData) {
          const newStockQuantity = (productData.stock_quantity || 0) + 1;
          const newInStock = true;
          
          const { error: stockUpdateError } = await supabase
            .from('products')
            .update({
              stock_quantity: newStockQuantity,
              in_stock: newInStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentOrder.product_id);
          
          if (stockUpdateError) {
            console.warn('Failed to restore product stock:', stockUpdateError);
          } else {
            console.log('Successfully restored product stock due to status change:', {
              productId: currentOrder.product_id,
              oldStock: productData.stock_quantity,
              newStock: newStockQuantity,
              reason: 'order_status_change'
            });
          }
        }
      } catch (stockError) {
        console.warn('Error restoring product stock:', stockError);
      }
    } else if (!wasOrderPaid && willOrderBePaid && !isOrderBeingCancelled) {
      // Order was not paid/confirmed but is now being marked as paid/confirmed
      // Decrease stock
      try {
        console.log('Decreasing stock due to order status change:', currentOrder.product_id);
        
        const { data: productData, error: productFetchError } = await supabase
          .from('products')
          .select('stock_quantity, in_stock')
          .eq('id', currentOrder.product_id)
          .single();
        
        if (productFetchError) {
          console.warn('Failed to fetch product data for stock decrease:', productFetchError);
        } else if (productData) {
          const newStockQuantity = Math.max(0, (productData.stock_quantity || 0) - 1);
          const newInStock = newStockQuantity > 0;
          
          const { error: stockUpdateError } = await supabase
            .from('products')
            .update({
              stock_quantity: newStockQuantity,
              in_stock: newInStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentOrder.product_id);
          
          if (stockUpdateError) {
            console.warn('Failed to decrease product stock:', stockUpdateError);
          } else {
            console.log('Successfully decreased product stock due to status change:', {
              productId: currentOrder.product_id,
              oldStock: productData.stock_quantity,
              newStock: newStockQuantity,
              reason: 'order_status_change'
            });
          }
        }
      } catch (stockError) {
        console.warn('Error decreasing product stock:', stockError);
      }
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
    
    // First, fetch the order to get product information before deleting
    const { data: orderToDelete, error: fetchError } = await supabase
      .from('art_orders')
      .select('product_id, status, payment_status')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching art order for deletion:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch order for deletion' 
      }, { status: 500 });
    }
    
    if (!orderToDelete) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order not found' 
      }, { status: 404 });
    }
    
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
    
    // If the order was paid/confirmed, restore the product stock
    if (orderToDelete.payment_status === 'PAID' || orderToDelete.status === 'confirmed') {
      try {
        console.log('Restoring stock for product:', orderToDelete.product_id);
        
        // Fetch current product data
        const { data: productData, error: productFetchError } = await supabase
          .from('products')
          .select('stock_quantity, in_stock')
          .eq('id', orderToDelete.product_id)
          .single();
        
        if (productFetchError) {
          console.warn('Failed to fetch product data for stock restoration:', productFetchError);
        } else if (productData) {
          // Increase stock by 1 and update in_stock status
          const newStockQuantity = (productData.stock_quantity || 0) + 1;
          const newInStock = true; // If we're adding stock, the product should be in stock
          
          const { error: stockUpdateError } = await supabase
            .from('products')
            .update({
              stock_quantity: newStockQuantity,
              in_stock: newInStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderToDelete.product_id);
          
          if (stockUpdateError) {
            console.warn('Failed to restore product stock:', stockUpdateError);
            // Don't fail the deletion just because stock update failed
          } else {
            console.log('Successfully restored product stock:', {
              productId: orderToDelete.product_id,
              oldStock: productData.stock_quantity,
              newStock: newStockQuantity
            });
          }
        }
      } catch (stockError) {
        console.warn('Error restoring product stock:', stockError);
        // Don't fail the deletion just because stock restoration failed
      }
    } else {
      console.log('Order was not paid/confirmed, no stock restoration needed');
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