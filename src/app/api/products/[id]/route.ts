import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the product from Supabase
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json(
        { error: `Failed to delete product: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error deleting product:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    // Fetch product from Supabase
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching product:', error);
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Transform data to match the frontend Product interface
    const product = {
      id: data.id,
      title: data.title,
      price: Number(data.price),
      originalPrice: data.original_price ? Number(data.original_price) : undefined,
      image: data.image,
      isNew: data.is_new,
      description: data.description || '',
      discount: data.discount || null
    };
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('Unhandled error in GET product by ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update a product (PATCH)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Get the updated data from the request
    const updates = await request.json();
    
    // Transform data to match the database schema
    const dbUpdates: any = {};
    
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.originalPrice !== undefined) dbUpdates.original_price = updates.originalPrice;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.isNew !== undefined) dbUpdates.is_new = updates.isNew;
    if (updates.discount !== undefined) dbUpdates.discount = updates.discount;
    if (updates.inStock !== undefined) dbUpdates.in_stock = updates.inStock;
    if (updates.stockQuantity !== undefined) dbUpdates.stock_quantity = updates.stockQuantity;
    
    // Update the product in Supabase
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json(
        { error: `Failed to update product: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Transform data to match the frontend Product interface
    const product = {
      id: data.id,
      title: data.title,
      price: Number(data.price),
      originalPrice: data.original_price ? Number(data.original_price) : undefined,
      image: data.image,
      isNew: data.is_new,
      description: data.description || '',
      discount: data.discount,
      inStock: data.in_stock,
      stockQuantity: data.stock_quantity
    };
    
    return NextResponse.json({ product });
  } catch (error) {
    console.error('Unexpected error updating product:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 