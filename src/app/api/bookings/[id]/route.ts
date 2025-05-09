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
    
    // Update course participants count if needed
    if (body.number_of_participants && body.course_id) {
      // Get the old booking to calculate difference
      const { data: oldBooking } = await supabaseAdmin
        .from('bookings')
        .select('number_of_participants, status')
        .eq('id', id)
        .single();
      
      if (oldBooking) {
        // Only adjust participant count if the booking was previously confirmed/pending and still is
        const wasActive = oldBooking.status === 'confirmed' || oldBooking.status === 'pending';
        const isStillActive = body.status === 'confirmed' || body.status === 'pending';
        
        if (wasActive && isStillActive) {
          const participantDifference = body.number_of_participants - oldBooking.number_of_participants;
          
          if (participantDifference !== 0) {
            // Get current course participants
            const { data: course } = await supabaseAdmin
              .from('course_instances')
              .select('current_participants')
              .eq('id', body.course_id)
              .single();
              
            if (course) {
              // Update course participants
              await supabaseAdmin
                .from('course_instances')
                .update({
                  current_participants: Math.max(0, course.current_participants + participantDifference)
                })
                .eq('id', body.course_id);
            }
          }
        } else if (wasActive && !isStillActive) {
          // Booking was active but is now cancelled/completed, remove participants
          const { data: course } = await supabaseAdmin
            .from('course_instances')
            .select('current_participants')
            .eq('id', body.course_id)
            .single();
            
          if (course) {
            await supabaseAdmin
              .from('course_instances')
              .update({
                current_participants: Math.max(0, course.current_participants - oldBooking.number_of_participants)
              })
              .eq('id', body.course_id);
          }
        } else if (!wasActive && isStillActive) {
          // Booking was not active but is now confirmed/pending, add participants
          const { data: course } = await supabaseAdmin
            .from('course_instances')
            .select('current_participants')
            .eq('id', body.course_id)
            .single();
            
          if (course) {
            await supabaseAdmin
              .from('course_instances')
              .update({
                current_participants: Math.max(0, course.current_participants + body.number_of_participants)
              })
              .eq('id', body.course_id);
          }
        }
      }
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
    
    // Check if we need to update course participants (only if booking was confirmed or pending)
    const wasActive = booking.status === 'confirmed' || booking.status === 'pending';
    
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