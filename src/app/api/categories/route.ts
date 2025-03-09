import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    // Get categories from Supabase
    const categories = await getCategories();
    
    // Return the categories as JSON
    return NextResponse.json({ 
      categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' }, 
      { status: 500 }
    );
  }
} 