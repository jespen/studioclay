import { NextRequest, NextResponse } from 'next/server';
import { SwishService } from '@/services/swish/swishService';
import { logDebug, logError } from '@/lib/logging';
import { createClient } from '@supabase/supabase-js';
import { validate as uuidValidate } from 'uuid';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Test endpoint specifically for course payments
 * Usage: /api/payments/swish/test-course?phone=07XXXXXXXX&course_id=xxx&amount=100
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    const courseId = searchParams.get('course_id');
    const amount = parseInt(searchParams.get('amount') || '100');
    const participants = parseInt(searchParams.get('participants') || '1');
    
    if (!phone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: phone',
        usage: '/api/payments/swish/test-course?phone=07XXXXXXXX&course_id=xxx&amount=100'
      }, { status: 400 });
    }
    
    // Validate or get a course ID if not provided
    let finalCourseId = courseId;
    let courseDetails = null;
    let courseValidationError = null;
    
    try {
      if (!courseId || (courseId && !uuidValidate(courseId))) {
        // If no course ID provided or the ID is not a valid UUID, get a valid course
        const { data: course, error: courseError } = await supabase
          .from('course_instances')
          .select('id, title, price, max_participants, course_templates(title)')
          .eq('active', true)
          .limit(1)
          .single();
          
        if (courseError || !course) {
          return NextResponse.json({
            success: false,
            error: 'No active courses found',
            details: courseError
          }, { status: 404 });
        }
        
        finalCourseId = course.id;
        courseDetails = course;
        
        if (courseId && courseId !== finalCourseId) {
          courseValidationError = `Invalid course ID '${courseId}', using '${finalCourseId}' instead`;
        }
      } else {
        // Validate that the provided course ID exists
        const { data: course, error: courseError } = await supabase
          .from('course_instances')
          .select('id, title, price, max_participants, course_templates(title)')
          .eq('id', courseId)
          .single();
          
        if (courseError || !course) {
          return NextResponse.json({
            success: false,
            error: `Course with ID '${courseId}' not found`,
            details: courseError
          }, { status: 404 });
        }
        
        finalCourseId = course.id;
        courseDetails = course;
      }
    } catch (courseError: any) {
      logError('Error validating course:', courseError);
      return NextResponse.json({
        success: false,
        error: 'Error validating course: ' + courseError.message,
        stack: courseError.stack
      }, { status: 500 });
    }
    
    // Get course title
    const courseTitle = courseDetails?.title || 
                     (courseDetails?.course_templates?.title) || 
                     'Kurs';
    
    // Generate payment reference
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const paymentReference = `CRST-${timestamp}-${randomNum}`;
    
    // Prepare user info
    const userInfo = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: phone,
      numberOfParticipants: participants.toString()
    };
    
    try {
      // Create payment record in database
      logDebug('Creating course payment record in database');
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          payment_method: 'swish',
          amount: amount,
          currency: 'SEK',
          payment_reference: paymentReference,
          product_type: 'course',
          product_id: finalCourseId,
          status: 'CREATED',
          user_info: userInfo,
          phone_number: phone,
          metadata: {
            test: true,
            course_details: {
              id: finalCourseId,
              title: courseTitle,
              participants: participants
            }
          }
        })
        .select()
        .single();
        
      if (paymentError) {
        logError('Failed to create course payment record:', paymentError);
        return NextResponse.json({
          success: false,
          error: `Failed to create payment record: ${paymentError.message}`,
          details: paymentError
        }, { status: 500 });
      }
      
      logDebug('Course payment record created successfully:', {
        id: paymentData.id,
        reference: paymentReference
      });
      
      // Create booking record
      let bookingId = null;
      try {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            course_instance_id: finalCourseId,
            customer_name: `${userInfo.firstName} ${userInfo.lastName}`,
            customer_email: userInfo.email,
            customer_phone: phone,
            payment_method: 'swish',
            booking_reference: paymentReference,
            number_of_participants: participants,
            payment_status: 'created',
            status: 'confirmed',
            price: amount,
            total_price: amount,
            metadata: {
              payment_id: paymentData.id,
              test: true
            }
          })
          .select()
          .single();
          
        if (bookingError) {
          logError('Error creating booking record:', bookingError);
        } else {
          bookingId = bookingData.id;
          logDebug('Booking record created:', {
            id: bookingId,
            reference: paymentReference
          });
          
          // Update payment record with booking ID
          await supabase
            .from('payments')
            .update({
              metadata: {
                ...paymentData.metadata,
                booking_id: bookingId
              }
            })
            .eq('payment_reference', paymentReference);
        }
      } catch (bookingError: any) {
        logError('Error in booking creation:', bookingError);
      }
      
      // Prepare callback URL
      let callbackUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://studioclay.se';
      
      // Ensure https
      if (callbackUrl.startsWith('http:')) {
        callbackUrl = callbackUrl.replace('http://', 'https://');
      }
      
      // Remove www in production
      if (process.env.NODE_ENV === 'production' && callbackUrl.includes('www.studioclay.se')) {
        callbackUrl = callbackUrl.replace('www.studioclay.se', 'studioclay.se');
      }
      
      // Add callback path
      callbackUrl = callbackUrl.replace(/\/$/, '') + '/api/payments/swish/callback';
      
      // Initialize SwishService
      const swishService = SwishService.getInstance();
      const formattedPhone = swishService.formatPhoneNumber(phone);
      
      // Construct Swish payment data
      const swishPaymentData = {
        payeePaymentReference: paymentReference,
        callbackUrl: callbackUrl,
        payeeAlias: swishService.getPayeeAlias(),
        amount: amount.toString(),
        currency: "SEK",
        message: `studioclay.se - ${courseTitle}`.substring(0, 50),
        payerAlias: formattedPhone
      };
      
      // Make the API call
      logDebug(`[TEST-COURSE] Making Swish API call with phone ${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`);
      const result = await swishService.createPayment(swishPaymentData);
      
      // Update payment record with Swish result
      if (result.success) {
        await supabase
          .from('payments')
          .update({
            swish_payment_id: result.data?.reference,
            swish_callback_url: callbackUrl,
            metadata: {
              ...paymentData.metadata,
              swish_result: result,
              swish_request: {
                sent_at: new Date().toISOString(),
                data: {
                  ...swishPaymentData,
                  payerAlias: `${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`
                }
              }
            }
          })
          .eq('payment_reference', paymentReference);
        
        // Update booking status
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({
              payment_status: 'created',
              metadata: {
                test: true,
                swish_payment_id: result.data?.reference
              }
            })
            .eq('id', bookingId);
        }
      } else {
        await supabase
          .from('payments')
          .update({
            status: 'ERROR',
            metadata: {
              ...paymentData.metadata,
              swish_error: result.error,
              swish_request: {
                sent_at: new Date().toISOString(),
                data: {
                  ...swishPaymentData,
                  payerAlias: `${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`
                }
              }
            }
          })
          .eq('payment_reference', paymentReference);
          
        // Update booking status
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({
              payment_status: 'error',
              metadata: {
                test: true,
                error: result.error
              }
            })
            .eq('id', bookingId);
        }
      }
      
      // Return results
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
        debug: {
          payment_reference: paymentReference,
          booking_id: bookingId,
          course_id: finalCourseId,
          course_title: courseTitle,
          course_validation_error: courseValidationError,
          amount,
          participants,
          user_info: userInfo,
          callback_url: callbackUrl
        }
      });
    } catch (error: any) {
      logError('Error in course test:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        stack: error.stack
      }, { status: 500 });
    }
  } catch (error: any) {
    logError('Unhandled error in course test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 