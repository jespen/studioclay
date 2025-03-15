import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for bookings
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    const statusFilter = url.searchParams.get('status');
    
    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    // Start building the query
    let query = supabaseAdmin
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
      .eq('course_id', courseId);
    
    // Apply status filter if provided
    if (statusFilter) {
      if (statusFilter === 'active') {
        // All statuses except cancelled
        query = query.not('status', 'eq', 'cancelled');
      } else if (statusFilter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      } else if (statusFilter !== 'all') {
        // Specific status filter (confirmed, pending, completed, etc.)
        query = query.eq('status', statusFilter);
      }
    }
    
    // Execute the query with sorting
    const { data, error } = await query.order('booking_date', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Process the data to maintain backward compatibility
    const processedData = (data || []).map((booking: any) => {
      if (booking.course) {
        const template = booking.course.template;
        booking.course = {
          id: booking.course.id,
          template_id: template?.id || booking.course.template_id,
          current_participants: booking.course.current_participants || 0,
          max_participants: template?.max_participants || booking.course.max_participants || 0,
          start_date: booking.course.start_date,
          end_date: booking.course.end_date,
          status: booking.course.status,
          created_at: booking.course.created_at,
          updated_at: booking.course.updated_at,
          template,
          instructor: booking.course.instructor,
          category: booking.course.category
        };
      }
      return booking;
    });
    
    return NextResponse.json({
      bookings: processedData,
      count: processedData.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.course_id || !body.customer_name || !body.customer_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Insert booking
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert(body)
      .select();
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      booking: data[0],
      status: 'success',
      message: 'Booking created successfully'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 