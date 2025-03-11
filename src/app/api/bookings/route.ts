import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const bookingData = await request.json();
    console.log('Received booking data:', bookingData);
    
    // Validate required fields
    const requiredFields = [
      'course_id', 'customer_name', 'customer_email', 'number_of_participants'
    ];
    
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          missingFields 
        }, 
        { status: 400 }
      );
    }
    
    // Check if the course instance exists and has available spots
    const { data: courseInstance, error: courseError } = await supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        template:course_templates(
          title,
          price,
          currency,
          max_participants
        )
      `)
      .eq('id', bookingData.course_id)
      .single();
    
    if (courseError) {
      console.error('Error fetching course instance:', courseError);
      return NextResponse.json(
        { error: 'Course not found' }, 
        { status: 404 }
      );
    }
    
    console.log('Found course instance:', courseInstance.title, 'with ID:', courseInstance.id);
    
    // Check if there are enough spots available
    if (courseInstance.max_participants !== null) {
      const currentParticipants = courseInstance.current_participants || 0;
      const availableSpots = courseInstance.max_participants - currentParticipants;
      
      if (bookingData.number_of_participants > availableSpots) {
        return NextResponse.json(
          { error: 'Not enough spots available', availableSpots }, 
          { status: 400 }
        );
      }
    }
    
    // Set default values for optional fields
    if (bookingData.status === undefined) bookingData.status = 'pending';
    if (bookingData.payment_status === undefined) bookingData.payment_status = 'unpaid';
    if (bookingData.booking_date === undefined) bookingData.booking_date = new Date().toISOString();
    
    // Handle the case where the client sends 'participants' instead of 'number_of_participants'
    if (bookingData.participants && !bookingData.number_of_participants) {
      bookingData.number_of_participants = bookingData.participants;
      delete bookingData.participants; // Remove the incorrect field
    }
    
    // Handle the optional message field
    if (!bookingData.message) {
      bookingData.message = null;
    }
    
    console.log('Inserting booking with data:', bookingData);
    
    // Insert the booking into Supabase
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating booking:', error);
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      );
    }
    
    console.log('Booking created successfully:', data.id);
    
    // Update the current_participants count for the course instance
    const { error: updateError } = await supabaseAdmin
      .from('course_instances')
      .update({ 
        current_participants: (courseInstance.current_participants || 0) + bookingData.number_of_participants 
      })
      .eq('id', bookingData.course_id);
    
    if (updateError) {
      console.error('Error updating course participants:', updateError);
      // We don't want to fail the booking if this update fails,
      // but we should log it for administrators to handle manually
    } else {
      console.log('Updated course participants count successfully');
    }
    
    // Return the created booking
    return NextResponse.json({ booking: data });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 