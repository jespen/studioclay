import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SwishCallbackData, PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';
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
        newStatus = PAYMENT_STATUS.PAID;
        break;
      case 'DECLINED':
        newStatus = PAYMENT_STATUS.DECLINED;
        break;
      case 'ERROR':
        newStatus = PAYMENT_STATUS.ERROR;
        break;
      default:
        newStatus = PAYMENT_STATUS.ERROR;
    }

    console.log('Payment status mapped from Swish:', {
      swishStatus: callbackData.status,
      mappedStatus: newStatus,
      paymentId: payment.id
    });

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

    // Om betalningen lyckades, skapa bokning eller presentkort
    let result = null;
    if (newStatus === PAYMENT_STATUS.PAID) {
      try {
        if (payment.product_type === 'gift_card') {
          console.log('Creating gift card from successful Swish payment');
          result = await createGiftCard(
            payment.id,
            payment.amount,
            payment.user_info,
            payment.metadata?.item_details
          );
          console.log('Gift card created successfully:', result);
        } else {
          console.log('Creating booking from successful Swish payment');
          result = await createBooking(
            payment.id,
            payment.product_id,
            payment.user_info
          );
          console.log('Booking created successfully:', result);
        }
      } catch (error) {
        console.error('Error creating record after payment:', error);
        // Vi fortsätter även om det misslyckas - detta hanteras manuellt
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          reference: payment.payment_reference,
          status: newStatus
        },
        result: result
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