import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';

// Cache duration in seconds
const CACHE_DURATION = 300; // 5 minutes since categories change less frequently

// Dynamic API route for categories
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    return new NextResponse(JSON.stringify({ categories: data }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`,
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch categories' 
    }, { status: 500 });
  }
}