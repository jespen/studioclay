import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Properly await and extract the ID parameter in Next.js 13+
    const id = await Promise.resolve(context.params.id);
    console.log('API: Fetching bookings for course:', id);
    
    // Fetch all bookings for this course
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        course:course_instances(
          *,
          template:course_templates(
            *,
            category:categories(*),
            instructor:instructors(*)
          )
        )
      `)
      .eq('course_id', id)
      .order('booking_date', { ascending: false });

    if (error) {
      console.error('API: Error fetching bookings:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('API: Successfully fetched bookings:', bookings?.length);
    
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('API: Error in bookings fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
} 