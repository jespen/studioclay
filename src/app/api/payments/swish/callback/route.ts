import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SwishCallbackData, PaymentStatus } from '@/types/payment';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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

    const cert = fs.readFileSync(path.resolve(process.cwd(), certPath));
    const verifier = crypto.createVerify('SHA256');
    verifier.update(body);
    
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

export async function POST(request: Request) {
  try {
    // Klona request för signaturverifiering (eftersom body endast kan läsas en gång)
    const requestClone = request.clone();
    
    // Verifiera Swish signatur
    const isValidSignature = await verifySwishSignature(requestClone);
    if (!isValidSignature) {
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse callback data
    const callbackData: SwishCallbackData = await request.json();
    console.log('Received Swish callback:', callbackData);

    // Validera nödvändig data
    if (!callbackData.payeePaymentReference || !callbackData.status) {
      return NextResponse.json(
        { success: false, error: 'Missing required callback data' },
        { status: 400 }
      );
    }

    // Hämta betalningsinformation
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', callbackData.payeePaymentReference)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', callbackData.payeePaymentReference);
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Mappa Swish status till vår interna status
    let newStatus: PaymentStatus;
    switch (callbackData.status) {
      case 'PAID':
        newStatus = 'PAID';
        break;
      case 'DECLINED':
        newStatus = 'DECLINED';
        break;
      case 'ERROR':
        newStatus = 'ERROR';
        break;
      default:
        newStatus = 'ERROR';
    }

    // Uppdatera betalningsstatus och metadata
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        metadata: {
          ...payment.metadata,
          swish_status: callbackData.status,
          swish_error_code: callbackData.errorCode,
          swish_error_message: callbackData.errorMessage
        }
      })
      .eq('id', payment.id);

    if (updateError) {
      throw new Error(`Failed to update payment status: ${updateError.message}`);
    }

    // Om betalningen lyckades, skapa bokning
    let booking = null;
    if (newStatus === 'PAID') {
      try {
        booking = await createBooking(
          payment.id,
          payment.product_id,
          payment.user_info
        );
      } catch (error) {
        console.error('Error creating booking:', error);
        // Vi fortsätter även om bokningen misslyckas - detta hanteras manuellt
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          reference: payment.payment_reference,
          status: newStatus
        },
        booking: booking
      }
    });
  } catch (error) {
    console.error('Error processing Swish callback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process callback' },
      { status: 500 }
    );
  }
} 