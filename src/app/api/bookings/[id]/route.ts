import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for booking operations
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      booking: data,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    console.log('=== PATCH BOOKING START ===');
    console.log('Booking ID:', id);
    console.log('Update data:', body);
    
    // Validate invoice fields
    if (body.invoice_address || body.invoice_postal_code || body.invoice_city) {
      // If any invoice field is provided, make sure required fields are present
      if (!body.invoice_address || !body.invoice_postal_code || !body.invoice_city) {
        return NextResponse.json(
          { error: 'When providing invoice details, address, postal code, and city are all required' },
          { status: 400 }
        );
      }
    }
    
    // *** FIX: Get the old booking data BEFORE updating ***
    const { data: oldBooking } = await supabaseAdmin
      .from('bookings')
      .select('number_of_participants, status, course_id')
      .eq('id', id)
      .single();
    
    if (!oldBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    console.log('=== OLD BOOKING DATA ===');
    console.log('Old participants:', oldBooking.number_of_participants);
    console.log('Old status:', oldBooking.status);
    console.log('Course ID:', oldBooking.course_id);
    
    // Prepare the update data
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    };
    
    // Update the booking
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select();
      
    if (error) {
      throw error;
    }
    
    console.log('=== BOOKING UPDATED SUCCESSFULLY ===');
    
    // *** FIX: Update course participants count - use course_id from old booking ***
    const courseId = body.course_id || oldBooking.course_id;
    
    if (courseId) {
      console.log('=== UPDATING COURSE PARTICIPANTS ===');
      
      // Determine the old and new participant counts and statuses
      const oldParticipants = oldBooking.number_of_participants || 0;
      const newParticipants = body.number_of_participants !== undefined ? body.number_of_participants : oldParticipants;
      const oldStatus = oldBooking.status;
      const newStatus = body.status !== undefined ? body.status : oldStatus;
      
      console.log('Participants change:', oldParticipants, '->', newParticipants);
      console.log('Status change:', oldStatus, '->', newStatus);
      
      // Only confirmed bookings should count towards current_participants
      // 'pending' bookings are waitlist and should NOT count
      const wasActive = oldStatus === 'confirmed';
      const isStillActive = newStatus === 'confirmed';
      
      console.log('Was active:', wasActive, 'Is still active:', isStillActive);
      
      // Get current course participants
      const { data: course } = await supabaseAdmin
        .from('course_instances')
        .select('current_participants')
        .eq('id', courseId)
        .single();
        
      if (course) {
        let newCurrentParticipants = course.current_participants;
        
        console.log('Current course participants:', course.current_participants);
        
        if (wasActive && isStillActive) {
          // Both old and new status are active - calculate participant difference
          const participantDifference = newParticipants - oldParticipants;
          console.log('Participant difference:', participantDifference);
          
          if (participantDifference !== 0) {
            newCurrentParticipants = Math.max(0, course.current_participants + participantDifference);
            console.log('Adjusting by difference:', participantDifference, 'New total:', newCurrentParticipants);
          }
        } else if (wasActive && !isStillActive) {
          // Booking was active but is now cancelled/completed - remove old participants
          newCurrentParticipants = Math.max(0, course.current_participants - oldParticipants);
          console.log('Removing participants (cancelled):', oldParticipants, 'New total:', newCurrentParticipants);
        } else if (!wasActive && isStillActive) {
          // Booking was not active but is now confirmed/pending - add new participants
          newCurrentParticipants = Math.max(0, course.current_participants + newParticipants);
          console.log('Adding participants (reactivated):', newParticipants, 'New total:', newCurrentParticipants);
        }
        
        // Update course participants if there's a change
        if (newCurrentParticipants !== course.current_participants) {
          console.log('=== UPDATING COURSE_INSTANCES ===');
          console.log('Before:', course.current_participants, 'After:', newCurrentParticipants);
          
          const { error: updateError } = await supabaseAdmin
            .from('course_instances')
            .update({
              current_participants: newCurrentParticipants
            })
            .eq('id', courseId);
            
          if (updateError) {
            console.error('Error updating course participants:', updateError);
          } else {
            console.log('Successfully updated course participants');
          }
        } else {
          console.log('No change in course participants needed');
        }
      } else {
        console.error('Course not found:', courseId);
      }
    } else {
      console.log('No course ID available for participant update');
    }
    
    return NextResponse.json({
      booking: data?.[0] || null,
      status: 'success',
      message: 'Booking updated successfully'
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }
    
    // Get the booking to update course participants
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      throw fetchError;
    }
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if we need to update course participants (only if booking was confirmed)
    // Pending bookings (waitlist) should NOT count towards current_participants
    const wasActive = booking.status === 'confirmed';
    
    // For Swish payments, the payment record will be automatically deleted due to CASCADE
    // For invoice payments, we only need to delete the booking
    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      throw deleteError;
    }
    
    // Update course participants count if the booking was active
    if (wasActive && booking.course_id) {
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
    
    return NextResponse.json({
      status: 'success',
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json(
      { error: 'Failed to delete booking', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 