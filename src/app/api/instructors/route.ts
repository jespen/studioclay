import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for instructors
export const dynamic = 'force-dynamic';

export async function GET() {
  // Server-side implementation of instructors retrieval
  try {
    const { data, error } = await supabaseAdmin
      .from('instructors')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    return NextResponse.json({ instructors: data });
  } catch (error) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch instructors' 
    }, { status: 500 });
  }
}