import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const waitlistData = await request.json();
    console.log('Received waitlist data:', waitlistData);
    
    // Validate required fields
    const requiredFields = [
      'course_id', 'customer_name', 'customer_email', 'number_of_participants'
    ];
    
    const missingFields = requiredFields.filter(field => !waitlistData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          missingFields 
        }, 
        { status: 400 }
      );
    }
    
    // Check if the course instance exists
    const { data: instance, error: courseError } = await supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        template:course_templates(*)
      `)
      .eq('id', waitlistData.course_id)
      .single();
    
    if (courseError) {
      console.error('Error fetching course instance:', courseError);
      return NextResponse.json(
        { error: 'Course not found' }, 
        { status: 404 }
      );
    }
    
    console.log('Found course instance for waitlist:', instance.title, 'with ID:', instance.id);
    
    // Verify that the course is actually full (as a safeguard)
    if (instance.max_participants === null || instance.current_participants < instance.max_participants) {
      console.log('Course is not full, redirecting to regular booking');
      return NextResponse.json(
        { 
          error: 'Course is not full', 
          availableSpots: instance.max_participants - instance.current_participants,
          shouldBook: true
        }, 
        { status: 400 }
      );
    }
    
    // Create a booking with 'waiting' status
    const bookingData = {
      course_id: waitlistData.course_id,
      customer_name: waitlistData.customer_name,
      customer_email: waitlistData.customer_email,
      customer_phone: waitlistData.customer_phone || null,
      number_of_participants: waitlistData.number_of_participants,
      booking_date: new Date().toISOString(),
      status: 'waiting',
      payment_status: 'unpaid',
      message: waitlistData.message || null
    };
    
    console.log('Creating booking with waiting status:', bookingData);
    
    // Insert the booking into Supabase
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();
    
    if (bookingError) {
      console.error('Error creating waiting list booking:', bookingError);
      return NextResponse.json(
        { error: bookingError.message }, 
        { status: 400 }
      );
    }
    
    console.log('Waiting list booking created successfully:', booking.id);
    
    // Return the created booking
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully added to waiting list',
      data: booking
    });
  } catch (error) {
    console.error('Error in waitlist API:', error);
    return NextResponse.json(
      { error: 'Failed to process waitlist request' }, 
      { status: 500 }
    );
  }
} 