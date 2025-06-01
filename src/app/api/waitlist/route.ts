import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { z } from 'zod';

// Dynamic API route for waitlist
export const dynamic = 'force-dynamic';

// Define validation schema
const waitlistSchema = z.object({
  course_id: z.string().uuid(),
  customer_name: z.string().min(1, "Name is required"),
  customer_email: z.string().email("Valid email is required"),
  customer_phone: z.string().optional().or(z.literal('')), // Make phone optional to match frontend
  number_of_participants: z.number().min(1, "At least one participant is required"),
  message: z.string().optional().nullable().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  console.log('=== WAITLIST API POST START ===');
  
  try {
    // Parse request body
    console.log('Parsing request body...');
    const requestData = await request.json();
    console.log('Received request data:', JSON.stringify(requestData, null, 2));
    
    // Validate the request data
    console.log('Validating request data...');
    const validationResult = waitlistSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      console.error("❌ Validation error:", validationResult.error);
      console.error("❌ Validation details:", JSON.stringify(validationResult.error.format(), null, 2));
      return NextResponse.json(
        { 
          error: "Invalid data provided", 
          details: validationResult.error.format(),
          receivedData: requestData
        },
        { status: 400 }
      );
    }
    
    const waitlistData = validationResult.data;
    console.log('✅ Validation successful. Processed data:', JSON.stringify(waitlistData, null, 2));
    
    // Check if course exists
    console.log('Checking if course exists with ID:', waitlistData.course_id);
    const { data: course, error: courseError } = await supabaseAdmin
      .from('course_instances')
      .select('id, title')
      .eq('id', waitlistData.course_id)
      .single();
    
    if (courseError || !course) {
      console.error("❌ Course not found. Error:", courseError);
      console.error("❌ Course data:", course);
      return NextResponse.json(
        { error: "Course not found", courseId: waitlistData.course_id },
        { status: 404 }
      );
    }
    
    console.log('✅ Course found:', JSON.stringify(course, null, 2));
    
    // Prepare insert data
    const insertData = {
      course_id: waitlistData.course_id,
      customer_name: waitlistData.customer_name,
      customer_email: waitlistData.customer_email,
      customer_phone: waitlistData.customer_phone || null, // Convert empty string to null
      number_of_participants: waitlistData.number_of_participants,
      message: waitlistData.message || null, // Convert empty string to null
      created_at: new Date().toISOString(),
    };
    
    console.log('Inserting waitlist entry with data:', JSON.stringify(insertData, null, 2));
    
    // Insert into waitlist table
    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .insert([insertData])
      .select();
    
    if (error) {
      console.error("❌ Error inserting waitlist entry:", error);
      console.error("❌ Insert data was:", JSON.stringify(insertData, null, 2));
      return NextResponse.json(
        { 
          error: "Failed to join waitlist", 
          details: error.message,
          insertData: insertData
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Successfully inserted waitlist entry:', JSON.stringify(data, null, 2));
    
    // Return success response
    const successResponse = { 
      success: true, 
      message: "Successfully added to waitlist",
      data: data[0]
    };
    
    console.log('✅ Returning success response:', JSON.stringify(successResponse, null, 2));
    console.log('=== WAITLIST API POST END ===');
    
    return NextResponse.json(successResponse, { status: 201 });
    
  } catch (error) {
    console.error("❌ Server error processing waitlist request:", error);
    console.error("❌ Error details:", error instanceof Error ? error.message : 'Unknown error');
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.log('=== WAITLIST API POST ERROR END ===');
    
    return NextResponse.json(
      { 
        error: "Server error processing waitlist request",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 