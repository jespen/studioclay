import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for bookings
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const statusFilter = searchParams.get('status');
    
    let query = supabaseAdmin.from('bookings').select(`
      *,
      course:course_instances (
        *,
        template:course_templates (
          *,
          category:categories (*),
          instructor:instructors (*)
        )
      )
    `);
    
    // Filter by course ID if provided
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
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
    
    const { data, error } = await query;
    
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
    
    // First check if the course exists and has available spots
    console.log('Checking course availability for ID:', body.course_id);
    const { data: course, error: courseError } = await supabaseAdmin
      .from('course_instances')
      .select('current_participants, max_participants')
      .eq('id', body.course_id)
      .single();
      
    if (courseError) {
      console.error('Error fetching course:', courseError);
      return NextResponse.json(
        { error: 'Course not found', details: courseError.message },
        { status: 404 }
      );
    }
    
    // Check if course is fully booked
    if (course.max_participants !== null && 
        course.current_participants + body.number_of_participants > course.max_participants) {
      console.warn('Course is fully booked:', {
        courseId: body.course_id,
        currentParticipants: course.current_participants,
        maxParticipants: course.max_participants,
        requestedParticipants: body.number_of_participants
      });
      return NextResponse.json(
        { error: 'Course is fully booked', details: 'Not enough available spots' },
        { status: 400 }
      );
    }
    
    // Insert booking in a transaction
    const { data: booking, error: bookingError } = await supabaseAdmin.rpc('create_booking_with_participants', {
      booking_data: {
        course_id: body.course_id,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone || null,
        number_of_participants: body.number_of_participants,
        booking_date: new Date().toISOString(),
        status: body.status || 'confirmed',
        payment_status: body.payment_status || 'CREATED',
        message: body.message || null,
        // Include invoice details if provided
        invoice_number: body.invoice_number || null,
        invoice_address: body.invoice_address || null,
        invoice_postal_code: body.invoice_postal_code || null,
        invoice_city: body.invoice_city || null,
        invoice_reference: body.invoice_reference || null,
        // Add price information
        unit_price: body.unit_price || null,
        total_price: body.total_price || null
      },
      participant_count: body.number_of_participants
    });
    
    if (bookingError) {
      console.error('Error creating booking with RPC:', bookingError);
      
      // Fallback to manual booking creation and participant count update
      console.log('Using fallback method for booking creation');
      
      // Start a transaction
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .insert({
          ...body,
          // Ensure consistent format for date
          booking_date: body.booking_date || new Date().toISOString()
        })
        .select();
        
      if (error) {
        console.error('Error creating booking:', error);
        throw error;
      }
      
      // Update course participant count
      if (body.status === 'confirmed' || body.status === 'pending' || !body.status) {
        const { error: updateError } = await supabaseAdmin
          .from('course_instances')
          .update({ 
            current_participants: course.current_participants + body.number_of_participants 
          })
          .eq('id', body.course_id);
          
        if (updateError) {
          console.error('Error updating course participants:', updateError);
          // We don't want to fail the booking if only the participant count update fails
          // Just log the error and continue
        }
      }
      
      return NextResponse.json({
        booking: data?.[0] || null,
        status: 'success',
        message: 'Booking created successfully'
      });
    }
    
    console.log('Booking created successfully with RPC:', booking);
    
    return NextResponse.json({
      booking: booking,
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