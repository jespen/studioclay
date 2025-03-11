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
    
    // Set default values
    if (!waitlistData.created_at) waitlistData.created_at = new Date().toISOString();
    if (!waitlistData.status) waitlistData.status = 'waiting';
    
    // Handle the optional message field
    if (waitlistData.message) {
      console.log('Customer message included in waitlist:', waitlistData.message);
    } else {
      waitlistData.message = null;
    }
    
    console.log('Inserting waitlist entry with data:', waitlistData);
    
    // Insert the waitlist entry into Supabase
    const { data: waitlistEntry, error: waitlistError } = await supabaseAdmin
      .from('waitlist')
      .insert([waitlistData])
      .select()
      .single();
    
    if (waitlistError) {
      console.error('Error adding to waitlist:', waitlistError);
      return NextResponse.json(
        { error: waitlistError.message }, 
        { status: 400 }
      );
    }
    
    console.log('Waitlist entry created successfully:', waitlistEntry.id);
    
    // Return the created waitlist entry
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully added to waitlist',
      data: waitlistEntry
    });
  } catch (error) {
    console.error('Error in waitlist API:', error);
    return NextResponse.json(
      { error: 'Failed to process waitlist request' }, 
      { status: 500 }
    );
  }
} 