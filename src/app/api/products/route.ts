import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Get products from Supabase
export async function GET(request: NextRequest) {
  try {
    // Check if we want published/unpublished products
    const { searchParams } = new URL(request.url);
    const inStock = searchParams.get('inStock');
    
    // Build query
    let query = supabaseAdmin.from('products').select('*');
    
    // Filter by in_stock if specified
    if (inStock === 'true') {
      query = query.eq('in_stock', true);
    } else if (inStock === 'false') {
      query = query.eq('in_stock', false);
    }
    
    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }
    
    // Transform data to match the frontend Product interface
    const products = data.map(item => ({
      id: item.id,
      title: item.title,
      price: Number(item.price),
      originalPrice: item.original_price ? Number(item.original_price) : undefined,
      image: item.image,
      isNew: item.is_new,
      description: item.description || '',
      discount: item.discount,
      inStock: item.in_stock
    }));
    
    console.log(`API Route: Fetched ${products.length} products`);
    
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Unexpected error fetching products:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
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
      const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
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