import { NextResponse } from 'next/server';
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
    console.log('API: Fetching waitlist for course:', id);
    
    // Fetch all waitlist entries for this course
    const { data: waitlist, error } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('course_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('API: Error fetching waitlist:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('API: Successfully fetched waitlist entries:', waitlist?.length);
    
    return NextResponse.json({ waitlist });
  } catch (error) {
    console.error('API: Error in waitlist fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 }
    );
  }
} 