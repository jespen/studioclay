import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logDebug, logError } from '@/lib/logging';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { SwishCallbackData, PaymentStatus, PAYMENT_STATUS } from '@/services/swish/types';
import { generateGiftCardPDF, GiftCardData } from '@/utils/giftCardPDF';
import { setupCertificate } from '../cert-helper';

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
  const supabase = createClient();
  
  try {
    const swishCallback = await request.json();
    logDebug('Received Swish callback:', swishCallback);

    const { 
      status, 
      payeePaymentReference: paymentReference,
      amount,
      errorCode,
      errorMessage 
    } = swishCallback;

    if (!paymentReference) {
      throw new Error('Missing payment reference');
    }

    // First, get the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', paymentReference)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    // Update payment status and metadata
    const metadata = {
      ...payment.metadata,
      callback_received: new Date().toISOString(),
      swish_callback: swishCallback,
      error_code: errorCode,
      error_message: errorMessage
    };

    await supabase
      .from('payments')
      .update({ 
        status,
        metadata
      })
      .eq('payment_reference', paymentReference);

    // Handle different payment statuses
    switch (status) {
      case 'PAID':
        // Handle successful payment
        await handleSuccessfulPayment(payment, amount);
        break;
      
      case 'DECLINED':
        // Handle declined payment
        logDebug('Payment was declined:', { paymentReference, errorCode, errorMessage });
        break;
      
      case 'ERROR':
        // Handle payment error
        logError('Payment error:', { paymentReference, errorCode, errorMessage });
        break;
      
      case 'CANCELLED':
        // Handle cancelled payment
        logDebug('Payment was cancelled:', { paymentReference });
        break;
      
      default:
        // Log unknown status
        logDebug('Received unknown payment status:', { status, paymentReference });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logError('Error in Swish callback:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to handle successful payment
async function handleSuccessfulPayment(payment: any, amount: number) {
  const { product_type, product_id, user_info, metadata } = payment;
  const quantity = metadata?.quantity || 1;

  try {
    switch (product_type) {
      case 'course':
        await handleCoursePayment(product_id, user_info, amount, quantity, payment);
        break;
      
      case 'gift_card':
        await handleGiftCardPayment(amount, user_info, metadata?.item_details, payment);
        break;
      
      case 'art_product':
        await handleArtProductPayment(product_id, user_info, amount, quantity, payment);
        break;
      
      default:
        throw new Error(`Unknown product type: ${product_type}`);
    }
  } catch (error) {
    logError('Error processing successful payment:', error);
    throw error;
  }
}

// Enkel ping-endpoint för att enkelt kontrollera om callback-endpointen är nåbar
export async function GET(request: NextRequest) {
  const requestId = uuidv4().substring(0, 8);
  
  logDebug(`[${requestId}] Swish callback ping received`);
  
  // Logga viktiga headers och information för felsökning
  const sourceIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Skapa en array av alla headers för loggning
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Undvik att logga känsliga headers som Authorization eller Cookie
    if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });
  
  logDebug(`[${requestId}] Ping request source: IP=${sourceIp}, User-Agent=${userAgent}`);
  
  return NextResponse.json({
    success: true,
    message: 'Swish callback endpoint is reachable',
    timestamp: new Date().toISOString(),
    requestId: requestId,
    source: {
      ip: sourceIp,
      userAgent: userAgent
    }
  });
} 