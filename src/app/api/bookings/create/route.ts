import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  logOperation,
  logError,
  createSuccessResponse,
  handleDatabaseError,
  handleValidationError
} from '@/utils/apiUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, bookingReference, status, customerInfo } = body;

    // Validate required fields
    if (!courseId || !bookingReference || !status || !customerInfo) {
      return handleValidationError('Missing required fields', {
        required: ['courseId', 'bookingReference', 'status', 'customerInfo'],
        received: { courseId, bookingReference, status, customerInfo }
      });
    }

    logOperation('Creating Booking', { courseId, bookingReference });

    // Get course details to verify it exists and has space
    const { data: course, error: courseError } = await supabase
      .from('course_instances')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      return handleDatabaseError(courseError, 'Fetching course');
    }

    if (!course) {
      return handleValidationError('Course not found', { courseId });
    }

    // Check if course is full
    const currentParticipants = course.current_participants || 0;
    const requestedParticipants = customerInfo.numberOfParticipants || 1;

    if (course.max_participants && (currentParticipants + requestedParticipants) > course.max_participants) {
      return handleValidationError('Course is full', {
        maxParticipants: course.max_participants,
        currentParticipants,
        requestedParticipants
      });
    }

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        course_id: courseId,
        booking_reference: bookingReference,
        status: 'pending',
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        number_of_participants: customerInfo.numberOfParticipants,
        message: customerInfo.message || null,
        booking_date: new Date().toISOString()
      })
      .select()
      .single();

    if (bookingError) {
      return handleDatabaseError(bookingError, 'Creating booking');
    }

    logOperation('Booking Created', { 
      bookingId: booking.id,
      reference: bookingReference
    });

    // Update course participant count
    const { error: updateError } = await supabase
      .from('course_instances')
      .update({ 
        current_participants: currentParticipants + requestedParticipants,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);

    if (updateError) {
      // If updating participant count fails, we should delete the booking
      await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      return handleDatabaseError(updateError, 'Updating course participants');
    }

    logOperation('Course Participants Updated', {
      courseId,
      newCount: currentParticipants + requestedParticipants
    });

    return createSuccessResponse({
      success: true,
      bookingId: booking.id,
      bookingReference
    });

  } catch (error) {
    logError(error, 'Booking creation');
    return handleDatabaseError(error, 'Unexpected error in booking creation');
  }
} 