import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get products from Supabase
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const inStock = url.searchParams.get('inStock');
    
    // Build the query
    let query = supabase.from('products').select('*');
    
    // Filter by in_stock if provided
    if (inStock === 'true') {
      query = query.eq('in_stock', true);
    } else if (inStock === 'false') {
      query = query.eq('in_stock', false);
    }
    
    // Order by created_at (newest first)
    query = query.order('created_at', { ascending: false });
    
    // Execute the query
    const { data: products, error } = await query;
    
    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
    
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Unhandled error in GET products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create or update a product in Supabase
export async function POST(request: NextRequest) {
  try {
    const productData = await request.json();
    
    // Validate required fields
    if (!productData.title || productData.price === undefined || !productData.image) {
      return NextResponse.json(
        { error: 'Missing required fields (title, price, image)' },
        { status: 400 }
      );
    }
    
    // Transform data to match the database schema
    const dbProduct = {
      title: productData.title,
      price: productData.price,
      original_price: productData.originalPrice || null,
      image: productData.image,
      description: productData.description || null,
      is_new: productData.isNew || false,
      discount: productData.discount || null,
      in_stock: productData.inStock !== undefined ? productData.inStock : true,
      stock_quantity: productData.stockQuantity || 1
    };
    
    // If id is provided, update existing product
    if (productData.id) {
      const { data, error } = await supabase
        .from('products')
        .update(dbProduct)
        .eq('id', productData.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating product:', error);
        return NextResponse.json(
          { error: `Failed to update product: ${error.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        product: {
          id: data.id,
          title: data.title,
          price: Number(data.price),
          originalPrice: data.original_price ? Number(data.original_price) : undefined,
          image: data.image,
          isNew: data.is_new,
          description: data.description || '',
          discount: data.discount,
          inStock: data.in_stock
        }
      });
    } 
    
    // Otherwise, insert new product
    const { data, error } = await supabase
      .from('products')
      .insert(dbProduct)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { error: `Failed to create product: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      product: {
        id: data.id,
        title: data.title,
        price: Number(data.price),
        originalPrice: data.original_price ? Number(data.original_price) : undefined,
        image: data.image,
        isNew: data.is_new,
        description: data.description || '',
        discount: data.discount,
        inStock: data.in_stock
      }
    });
  } catch (error) {
    console.error('Unexpected error creating/updating product:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 