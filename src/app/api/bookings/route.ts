import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('API: Creating new booking with data:', data);
    
    // Validate required fields
    if (!data.course_id || !data.customer_name || !data.customer_email || !data.number_of_participants) {
      return NextResponse.json(
        { error: 'Course ID, name, email, and number of participants are required' },
        { status: 400 }
      );
    }
    
    // Check if the course exists and has available spots
    const { data: course, error: courseError } = await supabaseAdmin
      .from('course_instances')
      .select('max_participants, current_participants')
      .eq('id', data.course_id)
      .single();
    
    if (courseError) {
      console.error('API: Error fetching course:', courseError);
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Check if there are enough spots available
    const availableSpots = course.max_participants - course.current_participants;
    if (availableSpots < data.number_of_participants) {
      return NextResponse.json(
        { error: `Not enough spots available. Only ${availableSpots} spots left.` },
        { status: 400 }
      );
    }
    
    // Prepare the booking data
    const bookingData = {
      course_id: data.course_id,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone || null,
      number_of_participants: data.number_of_participants,
      booking_date: new Date().toISOString(),
      status: data.status || 'confirmed',
      payment_status: data.payment_status || 'unpaid',
      message: data.message || null
    };
    
    // Create the booking
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert(bookingData)
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
      console.error('API: Error creating booking:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // Update the course participants count
    await supabaseAdmin
      .from('course_instances')
      .update({
        current_participants: course.current_participants + data.number_of_participants
      })
      .eq('id', data.course_id);
    
    console.log('API: Booking created successfully:', booking);
    
    return NextResponse.json({ booking });
  } catch (error) {
    console.error('API: Error in booking creation:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 