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
  customer_phone: z.string().min(1, "Phone number is required"),
  number_of_participants: z.number().min(1, "At least one participant is required"),
  message: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const requestData = await request.json();
    
    // Validate the request data
    const validationResult = waitlistSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return NextResponse.json(
        { error: "Invalid data provided", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const waitlistData = validationResult.data;
    
    // Check if course exists
    const { data: course, error: courseError } = await supabaseAdmin
      .from('course_instances')
      .select('id, title')
      .eq('id', waitlistData.course_id)
      .single();
    
    if (courseError || !course) {
      console.error("Course not found:", courseError);
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }
    
    // Insert into waitlist table
    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .insert([
        {
          course_id: waitlistData.course_id,
          customer_name: waitlistData.customer_name,
          customer_email: waitlistData.customer_email,
          customer_phone: waitlistData.customer_phone,
          number_of_participants: waitlistData.number_of_participants,
          message: waitlistData.message,
          created_at: new Date().toISOString(),
        }
      ])
      .select();
    
    if (error) {
      console.error("Error inserting waitlist entry:", error);
      return NextResponse.json(
        { error: "Failed to join waitlist" },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        message: "Successfully added to waitlist",
        data: data[0]
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error("Server error processing waitlist request:", error);
    return NextResponse.json(
      { error: "Server error processing waitlist request" },
      { status: 500 }
    );
  }
} 