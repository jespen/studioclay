import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for course bookings
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // Server-side implementation of course bookings retrieval
  try {
    // Wait for params to be fully resolved before using them
    const params = await Promise.resolve(context.params);
    const courseId = params.id;
    
    if (!courseId) {
      console.error('API Route Error: Missing course ID for bookings');
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    console.log('Fetching bookings for course ID:', courseId);
    
    // Get bookings from Supabase
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('course_id', courseId);
      
    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      courseId,
      bookings: data || [],
      count: data?.length || 0,
      message: 'Bookings fetched successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch bookings',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 