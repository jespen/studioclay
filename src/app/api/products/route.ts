import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';

// Cache duration in seconds
const CACHE_DURATION = 60; // 1 minute

// Get products from Supabase
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get query parameters
    const url = new URL(request.url);
    const inStock = url.searchParams.get('inStock');
    const published = url.searchParams.get('published');
    
    // Build the query
    let query = supabase.from('products').select('*');
    
    // Filter by in_stock if provided
    if (inStock === 'true') {
      query = query.eq('in_stock', true);
    } else if (inStock === 'false') {
      query = query.eq('in_stock', false);
    }
    
    // Filter by published if provided
    if (published === 'true') {
      query = query.eq('published', true);
    } else if (published === 'false') {
      query = query.eq('published', false);
    }
    
    // Order by created_at (newest first)
    query = query.order('created_at', { ascending: false });
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
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
      discount: item.discount || null,
      inStock: item.in_stock,
      stockQuantity: item.stock_quantity,
      published: item.published
    }));
    
    // Create response with caching headers
    return new NextResponse(JSON.stringify({ products }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create or update a product in Supabase
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
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
      stock_quantity: productData.stockQuantity || 1,
      published: productData.published !== undefined ? productData.published : true
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
          inStock: data.in_stock,
          published: data.published
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
        inStock: data.in_stock,
        published: data.published
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