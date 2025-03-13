import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function generateStaticParams() {
  // This is a placeholder function to satisfy static export requirements
  // In a real app, you would generate all possible parameter values
  return [{ id: 'placeholder' }];
}

import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    console.log('API: Fetching booking history for course:', id);
    
    // Fetch all history entries for this course
    const { data: history, error } = await supabaseAdmin
      .from('booking_history')
      .select('*')
      .eq('course_id', id)
      .order('cancellation_date', { ascending: false });
    
    if (error) {
      console.error('API: Error fetching booking history:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    console.log('API: Successfully fetched booking history:', history?.length || 0, 'entries');
    
    return NextResponse.json({ history });
  } catch (error) {
    console.error('API: Error in booking history fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking history' },
      { status: 500 }
    );
  }
} 