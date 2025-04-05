import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logDebug, logError } from '@/lib/logging';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { SwishCallbackData, PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';
import { generateGiftCardPDF, GiftCardData } from '@/utils/giftCardPDF';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
async function createBooking(paymentId: string, courseId: string, userInfo: any) {
  const bookingReference = crypto.randomUUID();
  
  // Get course price first
  const { data: course, error: courseError } = await supabase
    .from('course_instances')
    .select('price')
    .eq('id', courseId)
    .single();

  if (courseError) {
    throw new Error(`Failed to fetch course price: ${courseError.message}`);
  }
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      payment_id: paymentId,
      course_id: courseId,
      reference: bookingReference,
      status: 'CONFIRMED',
      customer_name: `${userInfo.firstName} ${userInfo.lastName}`,
      customer_email: userInfo.email,
      customer_phone: userInfo.phone,
      number_of_participants: parseInt(userInfo.numberOfParticipants) || 1,
      unit_price: course.price,
      total_price: course.price * (parseInt(userInfo.numberOfParticipants) || 1)
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create booking: ${error.message}`);
  }

  return booking;
}

// Hjälpfunktion för att skapa presentkort
async function createGiftCard(paymentId: string, amount: number, userInfo: any, itemDetails: any = {}) {
  // Generate a unique code for the gift card
  const generateUniqueCode = () => {
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `GC-${random}`;
  };
  
  console.log('Creating gift card with payment ID:', paymentId);
  console.log('Gift card amount:', amount);
  console.log('User info for gift card:', userInfo);
  console.log('Item details for gift card:', itemDetails);
  console.log('Recipient info:', {
    recipientName: itemDetails.recipientName || userInfo.recipientName,
    recipientEmail: itemDetails.recipientEmail || userInfo.recipientEmail,
    message: itemDetails.message || userInfo.message
  });
  
  // Create gift card data
  const giftCardData = {
    code: generateUniqueCode(),
    amount: Number(amount),
    type: itemDetails.type || 'digital',
    sender_name: `${userInfo.firstName} ${userInfo.lastName}`,
    sender_email: userInfo.email,
    sender_phone: userInfo.phone || null,
    recipient_name: itemDetails.recipientName || userInfo.recipientName || 'Mottagare',
    recipient_email: itemDetails.recipientEmail || userInfo.recipientEmail || null,
    message: itemDetails.message || userInfo.message || null,
    invoice_address: userInfo.invoiceDetails?.address || null,
    invoice_postal_code: userInfo.invoiceDetails?.postalCode || null,
    invoice_city: userInfo.invoiceDetails?.city || null,
    payment_reference: paymentId,
    payment_status: PAYMENT_STATUS.PAID,
    status: 'active',
    remaining_balance: Number(amount),
    is_emailed: false,
    is_printed: false,
    is_paid: true, // Mark as paid since Swish payment was successful
    expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // 1 year from now
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

export async function POST(request: NextRequest) {
  try {
    const requestId = uuidv4().substring(0, 8);
    logDebug(`[${requestId}] Received Swish callback`);
    
    // Parse the request body
    const body = await request.json();
    
    // Redact sensitive data for logging
    const logData = { ...body };
    if (logData.payerAlias) {
      logData.payerAlias = logData.payerAlias.substring(0, 4) + '****' + logData.payerAlias.slice(-2);
    }
    
    // Log the callback data with sensitive information redacted
    logDebug(`[${requestId}] Swish callback data:`, logData);

    // Verify the callback signature if in production
    const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    if (!isTestMode) {
      try {
        const signature = request.headers.get('Swish-Signature');
        
        if (!signature) {
          logError(`[${requestId}] Missing Swish-Signature header`);
          return NextResponse.json({ success: false, error: 'Missing signature' }, { status: 400 });
        }
        
        logDebug(`[${requestId}] Verifying signature: ${signature.substring(0, 10)}...`);
        
        // Get the CA certificate
        const caPath = process.env.SWISH_PROD_CA_PATH;
        if (!caPath) {
          logError(`[${requestId}] Missing Swish CA certificate configuration`);
          throw new Error('Missing Swish CA certificate configuration');
        }
        
        const caCert = fs.readFileSync(path.resolve(process.cwd(), caPath));
        
        // Convert the request body to a string for verification
        const dataToVerify = JSON.stringify(body);
        
        // Verify the signature
        const verify = crypto.createVerify('SHA256');
        verify.update(dataToVerify);
        const isValid = verify.verify(caCert, signature, 'base64');
        
        if (!isValid) {
          logError(`[${requestId}] Invalid signature`);
          return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
        }
        
        logDebug(`[${requestId}] Signature verified successfully`);
      } catch (error) {
        logError(`[${requestId}] Error verifying signature:`, error);
        // Continue processing even if signature verification fails in case the error is on our side
      }
    }

    // Extract the necessary information from the callback
    const {
      id,
      payeePaymentReference,
      paymentReference,
      callbackUrl,
      payerAlias,
      payeeAlias,
      amount,
      currency,
      message,
      status,
      dateCreated,
      datePaid,
      errorCode,
      errorMessage
    } = body;

    // Validate that we have the required fields
    if (!paymentReference && !payeePaymentReference) {
      logError(`[${requestId}] Missing payment reference in callback`);
      return NextResponse.json({ success: false, error: 'Missing payment reference' }, { status: 400 });
    }

    // Find the payment in our database using either the paymentReference or payeePaymentReference
    const reference = paymentReference || payeePaymentReference;
    logDebug(`[${requestId}] Looking up payment with reference: ${reference}`);

    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', reference)
      .single();

    if (fetchError || !payment) {
      logError(`[${requestId}] Payment not found:`, { reference, error: fetchError });
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    logDebug(`[${requestId}] Found payment with ID: ${payment.id}, current status: ${payment.status}`);

    // Update the payment status in our database
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: status,
        metadata: {
          ...payment.metadata,
          swish_callback: {
            received_at: new Date().toISOString(),
            data: logData
          },
          swish_error: errorCode ? { code: errorCode, message: errorMessage } : null
        }
      })
      .eq('id', payment.id);

    if (updateError) {
      logError(`[${requestId}] Error updating payment:`, updateError);
      return NextResponse.json({ success: false, error: 'Error updating payment' }, { status: 500 });
    }

    logDebug(`[${requestId}] Payment status updated to: ${status}`);

    // If payment is successful, continue with the booking process
    if (status === 'PAID') {
      logDebug(`[${requestId}] Processing successful payment`);
      
      // Create a booking record if this is a course booking
      if (payment.product_type === 'course') {
        try {
          // Check if a booking already exists for this payment
          const { data: existingBooking } = await supabase
            .from('bookings')
            .select('*')
            .eq('payment_id', payment.id)
            .single();

          if (!existingBooking) {
            // Create a new booking
            const bookingReference = `BK-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            
            // Get the course details
            const { data: course } = await supabase
              .from('courses')
              .select('*')
              .eq('id', payment.product_id)
              .single();

            if (!course) {
              logError(`[${requestId}] Course not found for booking:`, { product_id: payment.product_id });
              return NextResponse.json({ success: false, error: 'Course not found' }, { status: 400 });
            }

            // Create the booking
            const { data: booking, error: bookingError } = await supabase
              .from('bookings')
              .insert({
                reference: bookingReference,
                course_id: payment.product_id,
                payment_id: payment.id,
                customer_name: `${payment.user_info.firstName} ${payment.user_info.lastName}`,
                customer_email: payment.user_info.email,
                customer_phone: payment.phone_number,
                start_time: course.start_time,
                end_time: course.end_time,
                status: 'confirmed',
                number_of_participants: payment.user_info.numberOfParticipants || 1
              })
              .select()
              .single();

            if (bookingError) {
              logError(`[${requestId}] Error creating booking:`, bookingError);
              return NextResponse.json({ success: false, error: 'Error creating booking' }, { status: 500 });
            }

            logDebug(`[${requestId}] Booking created successfully:`, { reference: bookingReference });
          } else {
            logDebug(`[${requestId}] Booking already exists for this payment`, { 
              booking_id: existingBooking.id, 
              reference: existingBooking.reference 
            });
          }
        } catch (error) {
          logError(`[${requestId}] Error in booking creation:`, error);
          // Don't return an error response here - we still want to acknowledge the callback
        }
      }
    }

    // Always return a success response to acknowledge the callback
    logDebug(`[${requestId}] Swish callback processed successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error processing Swish callback:', { error: errorMessage });
    
    // Always return a success response to Swish to prevent retries
    // But log the error for our own tracking
    return NextResponse.json({ success: true });
  }
} 