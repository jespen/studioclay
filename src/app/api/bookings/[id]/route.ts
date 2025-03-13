import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Update a booking
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    console.log('API: Updating booking with ID:', id);
    
    // Get the update data from the request
    const data = await request.json();
    console.log('API: Booking update data:', data);
    
    // Validate required fields
    if (!data.customer_name || !data.customer_email || !data.number_of_participants) {
      return NextResponse.json(
        { error: 'Name, email, and number of participants are required' },
        { status: 400 }
      );
    }
    
    // First, get the current booking to get the course_id and previous number_of_participants
    const { data: currentBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error('API: Error fetching current booking:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 404 }
      );
    }
    
    // Prepare the update data
    const updateData = {
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      number_of_participants: data.number_of_participants,
      status: data.status,
      payment_status: data.payment_status,
      message: data.message,
      updated_at: new Date().toISOString()
    };
    
    // Update the booking in the database
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', id)
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
      .single();
    
    if (error) {
      console.error('API: Error updating booking:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // If the booking was updated successfully, update the course participants count if needed
    if (currentBooking && currentBooking.course_id) {
      let participantsDiff = 0;
      
      // Calculate participant difference based on number changes
      if (data.number_of_participants !== currentBooking.number_of_participants) {
        participantsDiff = data.number_of_participants - currentBooking.number_of_participants;
      }
      
      // Adjust for status changes
      if (data.status !== currentBooking.status) {
        if (data.status === 'cancelled' && currentBooking.status !== 'cancelled') {
          // When changing to cancelled, subtract all participants
          participantsDiff -= data.number_of_participants;
        } else if (data.status !== 'cancelled' && currentBooking.status === 'cancelled') {
          // When changing from cancelled to another status, add all participants
          participantsDiff += data.number_of_participants;
        }
      }
      
      // Only update if there's a change in participants
      if (participantsDiff !== 0) {
        // Get the current course instance
        const { data: course, error: courseError } = await supabaseAdmin
          .from('course_instances')
          .select('current_participants')
          .eq('id', currentBooking.course_id)
          .single();
        
        if (!courseError && course) {
          // Update the course participants count
          await supabaseAdmin
            .from('course_instances')
            .update({
              current_participants: Math.max(0, course.current_participants + participantsDiff)
            })
            .eq('id', currentBooking.course_id);
        }
      }
    }
    
    console.log('API: Booking updated successfully:', booking);
    
    return NextResponse.json({ booking });
  } catch (error) {
    console.error('API: Error in booking update:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// Delete a booking
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    console.log('API: Processing booking cancellation for ID:', id);
    
    // First, get the booking details
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('API: Error fetching booking:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 404 }
      );
    }

    // Create history record
    const historyData = {
      original_booking_id: booking.id,
      course_id: booking.course_id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      number_of_participants: booking.number_of_participants,
      original_booking_date: booking.booking_date,
      cancellation_date: new Date().toISOString(),
      history_type: 'cancelled',
      message: booking.message
    };

    const { error: historyError } = await supabaseAdmin
      .from('booking_history')
      .insert(historyData);

    if (historyError) {
      console.error('API: Error creating history record:', historyError);
      return NextResponse.json(
        { error: 'Failed to record booking cancellation' },
        { status: 400 }
      );
    }
    
    // Delete the original booking
    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('API: Error deleting booking:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }
    
    // Update course participants count
    if (booking.course_id) {
      const { data: course, error: courseError } = await supabaseAdmin
        .from('course_instances')
        .select('current_participants')
        .eq('id', booking.course_id)
        .single();
      
      if (!courseError && course) {
        await supabaseAdmin
          .from('course_instances')
          .update({
            current_participants: Math.max(0, course.current_participants - booking.number_of_participants)
          })
          .eq('id', booking.course_id);
      }
    }
    
    console.log('API: Booking successfully moved to history and deleted');
    
    return NextResponse.json({ 
      success: true,
      message: 'Booking cancelled and moved to history'
    });
  } catch (error) {
    console.error('API: Error in booking cancellation:', error);
    return NextResponse.json(
      { error: 'Failed to process booking cancellation' },
      { status: 500 }
    );
  }
} 