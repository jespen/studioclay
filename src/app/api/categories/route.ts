import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for categories
export const dynamic = 'force-dynamic';

export async function GET() {
  // Server-side implementation of categories retrieval
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    return NextResponse.json({ categories: data });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch categories' 
    }, { status: 500 });
  }
}