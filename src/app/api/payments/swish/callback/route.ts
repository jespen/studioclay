import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logDebug, logError, logInfo } from '@/lib/logging';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { SwishCallbackData, PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';
import { generateGiftCardPDF, GiftCardData } from '@/utils/giftCardPDF';
import { setupCertificate } from '../cert-helper';
import { PAYMENT_STATUSES, getValidPaymentStatus } from '@/constants/statusCodes';
import { sendServerBookingConfirmationEmail } from '@/utils/serverEmail';
import { SwishService } from '@/services/swish/SwishService';
import { SwishCallbackSchema } from '@/services/swish/types';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Type declaration for global state
declare global {
  var keepAliveTimers: NodeJS.Timeout[];
}

// Hjälpfunktion för att verifiera Swish signatur
async function verifySwishSignature(request: Request): Promise<boolean> {
  // I testmiljö skippar vi signaturverifiering
  if (process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true') {
    return true;
  }

  try {
    const signature = request.headers.get('Signature');
    if (!signature) {
      console.error('No signature found in request headers');
      return false;
    }

    const body = await request.text();
    const certPath = process.env.SWISH_PROD_CA_PATH;
    
    if (!certPath) {
      throw new Error('Missing Swish CA certificate configuration');
    }

    // Läs in certifikatet
    const cert = fs.readFileSync(path.resolve(process.cwd(), certPath));
    
    // Skapa en verifierare med SHA256
    const verifier = crypto.createVerify('SHA256');
    verifier.update(body);
    
    // Verifiera signaturen med certifikatet
    return verifier.verify(cert, signature, 'base64');
  } catch (error) {
    console.error('Error verifying Swish signature:', error);
    return false;
  }
}

// Hjälpfunktion för att skapa bokning
async function createBooking(paymentId: string, courseId: string, userInfo: any, bookingReference: string) {
  console.log(`Creating booking for course ${courseId} with payment ${paymentId}`);
  
  try {
    // First get the course instance data separately
    const { data: courseInstance, error: courseInstanceError } = await supabase
    .from('course_instances')
      .select('*')
    .eq('id', courseId)
    .single();

    if (courseInstanceError) {
      console.error('Error fetching course instance data:', courseInstanceError);
      throw new Error(`Failed to get course instance data: ${courseInstanceError.message}`);
    }

    if (!courseInstance) {
      throw new Error('Course instance not found');
    }

    // Then get template data separately if we have a template_id
    let templateData = null;
    if (courseInstance.template_id) {
      const { data: template, error: templateError } = await supabase
        .from('course_templates')
        .select('*')
        .eq('id', courseInstance.template_id)
        .single();

      if (templateError) {
        console.error('Error fetching course template data:', templateError);
        // Don't throw, we can continue with just the instance data
      } else {
        templateData = template;
      }
    }

    // Combine the data
    const courseData = {
      ...courseInstance,
      template: templateData
    };
    
    // Format date using ISO format
    const bookingDate = new Date().toISOString();

    // Create the booking with columns matching the database schema
    const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_reference: bookingReference, // Use 'booking_reference' instead of 'reference'
      course_id: courseId,
      customer_name: `${userInfo.firstName} ${userInfo.lastName}`,
      customer_email: userInfo.email,
      customer_phone: userInfo.phone,
      number_of_participants: parseInt(userInfo.numberOfParticipants) || 1,
      booking_date: bookingDate,
      status: 'confirmed',
      payment_status: PAYMENT_STATUSES.PAID,
      payment_method: 'swish',
      unit_price: courseData.template?.price || courseData.price || 0,
      total_price: (courseData.template?.price || courseData.price || 0) * (parseInt(userInfo.numberOfParticipants) || 1),
      currency: 'SEK'
    })
    .select()
    .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    // Update course participants count
    const participantsToAdd = parseInt(userInfo.numberOfParticipants) || 1;
    
    // First get the current participants count
    const { data: courseParticipantsData, error: getCourseError } = await supabase
      .from('course_instances')
      .select('current_participants')
      .eq('id', courseId)
      .single();
      
    if (getCourseError) {
      console.error('Error getting current course participants:', getCourseError);
      // Don't throw here, as the booking is already created
    } else {
      // Calculate new participants count
      const currentParticipants = courseParticipantsData.current_participants || 0;
      const newParticipantsCount = currentParticipants + participantsToAdd;
      
      // Update the course_instances record
      const { error: updateError } = await supabase
        .from('course_instances')
        .update({ 
          current_participants: newParticipantsCount
        })
        .eq('id', courseId);
        
      if (updateError) {
        console.error('Error updating course participants:', updateError);
        // Don't throw here as booking is created
      }
    }

    // Also update the payment record to link to the booking
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        booking_id: booking.id
      })
      .eq('id', paymentId);

    if (paymentUpdateError) {
      console.error('Error linking payment to booking:', paymentUpdateError);
      // Don't throw here as booking is created
  }

  return booking;
  } catch (error) {
    console.error('Error in booking creation:', error);
    throw error;
  }
}

// Hjälpfunktion för att skapa presentkort
async function createGiftCard(paymentId: string, amount: number, userInfo: any, itemDetails: any = {}) {
  console.log('Creating gift card with payment ID:', paymentId);
  console.log('Gift card amount:', amount);
  console.log('User info for gift card:', userInfo);
  console.log('Item details for gift card:', itemDetails);
  console.log('Recipient info:', {
    recipientName: itemDetails.recipientName || userInfo.recipientName,
    recipientEmail: itemDetails.recipientEmail || userInfo.recipientEmail,
    message: itemDetails.message || userInfo.message
  });
  
  // Import the gift card utilities
  const { generateUniqueGiftCardCode, createGiftCardData } = await import('@/utils/giftCardUtils');
  
  // Generate a unique code using the centralized function
  const code = await generateUniqueGiftCardCode(supabase);
  
  // Create gift card data using the centralized function
  const giftCardData = {
    code: code,
    amount: amount,
    type: itemDetails.type || 'digital',
    sender_name: userInfo.firstName + ' ' + userInfo.lastName,
    sender_email: userInfo.email,
    sender_phone: userInfo.phone || '',
    recipient_name: itemDetails.recipientName || '',
    recipient_email: itemDetails.recipientEmail || '',
    message: itemDetails.message || '',
    payment_reference: paymentId,
    payment_status: 'PAID',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_paid: true,
    payment_method: 'swish'
  };
  
  console.log('Final gift card data to insert:', {
    amount: giftCardData.amount,
    recipient_name: giftCardData.recipient_name,
    recipient_email: giftCardData.recipient_email,
    message: giftCardData.message,
    payment_reference: giftCardData.payment_reference
  });

  // Insert gift card into database
  const { data: giftCard, error } = await supabase
    .from('gift_cards')
    .insert([giftCardData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create gift card: ${error.message}`);
  }

  return giftCard;
}

/**
 * POST handler for Swish callbacks
 */
export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Log the incoming request
    logInfo(`[${requestId}] Received Swish callback`, {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });

    // Verify content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid content type. Expected application/json');
    }

    // Parse the request body
    const callbackData = await request.json();

    // Log the callback data (masking sensitive information)
    logInfo(`[${requestId}] Callback data`, {
      ...callbackData,
      payerAlias: callbackData.payerAlias ? `${callbackData.payerAlias.substring(0, 4)}****${callbackData.payerAlias.slice(-2)}` : undefined
    });

    // Get SwishService instance
    const swishService = SwishService.getInstance();

    // Process the callback
    await swishService.handleCallback(callbackData);

    // Log processing time
    const processingTime = Date.now() - startTime;
    logInfo(`[${requestId}] Callback processed successfully`, {
      processingTime: `${processingTime}ms`
    });

    // Return success response
    return NextResponse.json({ status: 'OK' }, { status: 200 });

  } catch (error) {
    // Log the error
    logError(`[${requestId}] Error processing Swish callback:`, error);

    // Try to log the error to Supabase
    try {
      await supabase.from('error_logs').insert({
        request_id: requestId,
        error_type: 'swish_callback',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        request_data: await request.json().catch(() => null),
        processing_time: Date.now() - startTime
      });
    } catch (loggingError) {
      logError(`[${requestId}] Failed to log error to database:`, loggingError);
    }

    // Return error response
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'Failed to process callback',
        requestId
      },
      { status: 500 }
    );
  }
}
