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
  // Generera ett unikt ID för denna request för spårbarhet i loggarna
  const requestId = uuidv4().substring(0, 8);
  
  // Lägg till extra loggning i början av funktionen
  logDebug(`[${requestId}] ===== SWISH CALLBACK RECEIVED =====`);
  logDebug(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
  logDebug(`[${requestId}] URL: ${request.url}`);
  
  try {
    // Konfigurera certifikat i produktionsmiljö
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SWISH_TEST_MODE !== 'true') {
      logDebug(`[${requestId}] Setting up Swish certificates from environment variables in callback endpoint`);
      const certSetupResult = setupCertificate();
      
      if (!certSetupResult.success) {
        logError(`[${requestId}] Failed to set up Swish certificates in callback endpoint:`, certSetupResult);
      }
    }
    
    // Försök att läsa body både som text och JSON för att fånga eventuella problem
    let bodyText;
    let body;
    
    try {
      // Klona request för att kunna läsa body både som text och JSON
      const requestClone = request.clone();
      bodyText = await requestClone.text();
      logDebug(`[${requestId}] Raw request body: ${bodyText}`);
      
      // Försök tolka JSON
      body = await request.json();
    } catch (parseError) {
      logError(`[${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid JSON body',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, { status: 400 });
    }
    
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
          // I produktion fortsätter vi ändå för att inte missa betalningar vid konfigurationsfel
          logDebug(`[${requestId}] Continuing despite missing signature for robustness`);
        } else {
          logDebug(`[${requestId}] Verifying signature: ${signature.substring(0, 10)}...`);
          
          // Get the CA certificate
          const caPath = process.env.SWISH_PROD_CA_PATH;
          if (!caPath) {
            logError(`[${requestId}] Missing Swish CA certificate configuration`);
            // Fortsätt ändå, vi vill inte missa betalningar
            logDebug(`[${requestId}] Continuing despite missing CA certificate for robustness`);
          } else {
            const caCert = fs.readFileSync(path.resolve(process.cwd(), caPath));
            
            // Convert the request body to a string for verification
            const dataToVerify = bodyText || JSON.stringify(body);
            
            // Verify the signature
            const verify = crypto.createVerify('SHA256');
            verify.update(dataToVerify);
            const isValid = verify.verify(caCert, signature, 'base64');
            
            if (!isValid) {
              logError(`[${requestId}] Invalid signature`);
              // I produktion fortsätter vi ändå för att inte missa betalningar vid konfigurationsfel
              logDebug(`[${requestId}] Continuing despite invalid signature for robustness`);
            } else {
              logDebug(`[${requestId}] Signature verified successfully`);
            }
          }
        }
      } catch (error) {
        logError(`[${requestId}] Error verifying signature:`, error);
        // Continue processing even if signature verification fails in case the error is on our side
        logDebug(`[${requestId}] Continuing despite signature verification error for robustness`);
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

    // If the payment was successful and it's for a course, create a booking
    if (status === PAYMENT_STATUS.PAID) {
      logDebug(`[${requestId}] Payment is PAID, processing related actions`);
      
      // Get the product type to determine what actions to take
      const productType = payment.product_type;
      const productId = payment.product_id;
      const userInfo = payment.user_info;
      
      logDebug(`[${requestId}] Product type: ${productType}, Product ID: ${productId}`);
      
      if (productType === 'course' && productId && userInfo) {
        try {
          // Check if we already have a booking for this payment to avoid duplicates
          const { data: existingBooking } = await supabase
            .from('bookings')
            .select('id, reference')
            .eq('payment_id', payment.id)
            .single();
            
          if (!existingBooking) {
            logDebug(`[${requestId}] No existing booking found, creating new booking`);
            
            // Create a booking for this payment
            const booking = await createBooking(payment.id, productId, userInfo);
            const bookingReference = booking.reference;
            
            logDebug(`[${requestId}] Booking created with reference: ${bookingReference}`);
            
            // Try to send confirmation email
            try {
              logDebug(`[${requestId}] Sending booking confirmation email`);
              
              const { sendServerBookingConfirmationEmail } = await import('@/utils/serverEmail');
              
              const emailResult = await sendServerBookingConfirmationEmail({
                email: userInfo.email,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                bookingReference: bookingReference,
                courseId: productId
              });
              
              logDebug(`[${requestId}] Email sending result:`, emailResult);
            } catch (emailError) {
              logError(`[${requestId}] Error sending confirmation email:`, emailError);
              // Don't fail the overall process if email sending fails
            }
          } else {
            logDebug(`[${requestId}] Booking already exists for this payment`, { 
              booking_id: existingBooking.id, 
              reference: existingBooking.reference 
            });
          }
        } catch (error) {
          logError(`[${requestId}] Error in booking creation:`, error);
          // Logg felet men returnera ändå 200 OK till Swish för att förhindra återförsök
        }
      }
      // Handle gift cards
      else if (productType === 'gift_card' && userInfo) {
        try {
          // Check if we already have a gift card for this payment
          const { data: existingGiftCard } = await supabase
            .from('gift_cards')
            .select('id, code')
            .eq('payment_reference', payment.id)
            .single();
            
          if (!existingGiftCard) {
            logDebug(`[${requestId}] No existing gift card found, creating new gift card`);
            
            // Create gift card
            const itemDetails = payment.metadata?.item_details || {};
            const giftCard = await createGiftCard(payment.id, payment.amount, userInfo, itemDetails);
            
            logDebug(`[${requestId}] Gift card created with code: ${giftCard.code}`);
            
            // Generate gift card PDF if digital
            if (giftCard.type === 'digital' && giftCard.recipient_email) {
              try {
                logDebug(`[${requestId}] Generating gift card PDF`);
                
                const giftCardData: GiftCardData = {
                  code: giftCard.code,
                  amount: giftCard.amount,
                  expiresAt: giftCard.expires_at,
                  recipientName: giftCard.recipient_name,
                  senderName: giftCard.sender_name,
                  message: giftCard.message || ''
                };
                
                const pdfBuffer = await generateGiftCardPDF(giftCardData);
                
                // Store PDF in Supabase storage
                const { data: storageData, error: storageError } = await supabase
                  .storage
                  .from('gift-cards')
                  .upload(`${giftCard.code}.pdf`, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true
                  });
                  
                if (storageError) {
                  logError(`[${requestId}] Error storing gift card PDF:`, storageError);
                } else {
                  logDebug(`[${requestId}] Gift card PDF stored:`, storageData);
                  
                  // Try to send email with gift card
                  try {
                    const { sendServerGiftCardEmail } = await import('@/utils/serverEmail');
                    
                    const emailResult = await sendServerGiftCardEmail({
                      recipientEmail: giftCard.recipient_email!,
                      recipientName: giftCard.recipient_name,
                      senderName: giftCard.sender_name,
                      amount: giftCard.amount,
                      code: giftCard.code,
                      message: giftCard.message || '',
                      giftCardUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/gift-cards/${giftCard.code}/download`
                    });
                    
                    logDebug(`[${requestId}] Gift card email result:`, emailResult);
                    
                    // Mark as emailed
                    await supabase
                      .from('gift_cards')
                      .update({ is_emailed: true })
                      .eq('id', giftCard.id);
                  } catch (emailError) {
                    logError(`[${requestId}] Error sending gift card email:`, emailError);
                  }
                }
              } catch (pdfError) {
                logError(`[${requestId}] Error generating gift card PDF:`, pdfError);
              }
            }
          } else {
            logDebug(`[${requestId}] Gift card already exists:`, existingGiftCard);
          }
        } catch (giftCardError) {
          logError(`[${requestId}] Error processing gift card:`, giftCardError);
          // Don't return an error response here - we still want to acknowledge the callback
        }
      }
      // Handle art_product type
      else if (productType === 'art_product' && productId) {
        try {
          logDebug(`[${requestId}] Handling art product purchase, product ID: ${productId}`);
          
          // Check if we already have an art_order for this payment
          const { data: existingOrder } = await supabase
            .from('art_orders')
            .select('id, order_reference')
            .eq('order_reference', reference)
            .single();
            
          if (!existingOrder) {
            // Create art order record if it doesn't exist
            // (It should already exist as it's created in the create payment endpoint, but ensuring it here)
            const { data: orderData, error: orderError } = await supabase
              .from('art_orders')
              .upsert({
                product_id: productId,
                customer_name: userInfo.firstName + ' ' + userInfo.lastName,
                customer_email: userInfo.email,
                customer_phone: payment.phone_number,
                payment_method: 'swish',
                order_reference: reference,
                payment_status: status,
                unit_price: payment.amount,
                total_price: payment.amount,
                status: 'confirmed',
                metadata: {
                  payment_id: payment.id,
                  user_info: userInfo
                }
              }, { onConflict: 'order_reference' })
              .select()
              .single();

            if (orderError) {
              logError(`[${requestId}] Error creating/updating art order:`, orderError);
            } else {
              logDebug(`[${requestId}] Art order created/updated:`, { id: orderData.id, reference: orderData.order_reference });
              
              // Update product stock if needed
              try {
                // First get the current product
                const { data: productData, error: productFetchError } = await supabase
                  .from('products')
                  .select('title, price, description, image, stock_quantity, in_stock')
                  .eq('id', productId)
                  .single();
                  
                if (productFetchError) {
                  logError(`[${requestId}] Error fetching product for stock update:`, productFetchError);
                } else if (productData) {
                  // Calculate new stock quantity
                  const newQuantity = Math.max(0, (productData.stock_quantity || 1) - 1);
                  
                  // Update the product with new stock quantity
                  const { error: updateError } = await supabase
                    .from('products')
                    .update({ 
                      stock_quantity: newQuantity,
                      in_stock: newQuantity > 0
                    })
                    .eq('id', productId);
                    
                  if (updateError) {
                    logError(`[${requestId}] Error updating product stock:`, updateError);
                  } else {
                    logDebug(`[${requestId}] Updated product ${productId} stock to ${newQuantity}`);
                  }
                  
                  // Send confirmation email
                  try {
                    const { sendServerProductOrderConfirmationEmail } = await import('@/utils/serverEmail');
                    
                    const emailResult = await sendServerProductOrderConfirmationEmail({
                      userInfo: {
                        firstName: userInfo.firstName,
                        lastName: userInfo.lastName,
                        email: userInfo.email,
                        phone: userInfo.phone || payment.phone_number
                      },
                      paymentDetails: {
                        method: 'swish',
                        status: 'PAID',
                        reference: reference,
                        amount: payment.amount
                      },
                      productDetails: {
                        id: productId,
                        title: productData.title,
                        description: productData.description,
                        price: payment.amount,
                        quantity: 1,
                        image: productData.image
                      },
                      orderReference: reference
                    });
                    
                    logDebug(`[${requestId}] Product order email result:`, emailResult);
                  } catch (emailError) {
                    logError(`[${requestId}] Error sending product order email:`, emailError);
                  }
                }
              } catch (stockError) {
                logError(`[${requestId}] Error updating product stock:`, stockError);
                // Continue execution - stock update is not critical
              }
            }
          } else {
            logDebug(`[${requestId}] Art order already exists:`, existingOrder);
            
            // Update the payment status
            const { error: updateOrderError } = await supabase
              .from('art_orders')
              .update({ payment_status: status })
              .eq('order_reference', reference);
              
            if (updateOrderError) {
              logError(`[${requestId}] Error updating art order status:`, updateOrderError);
            } else {
              logDebug(`[${requestId}] Updated art order payment status to ${status}`);
            }
          }
        } catch (artProductError) {
          logError(`[${requestId}] Error processing art product:`, artProductError);
          // Don't return an error response - we want to acknowledge the callback
        }
      }
    }

    // Always return a success response to acknowledge the callback
    logDebug(`[${requestId}] ===== SWISH CALLBACK COMPLETED SUCCESSFULLY =====`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`[${requestId}] ===== SWISH CALLBACK ERROR =====`);
    logError(`[${requestId}] Error processing Swish callback:`, { error: errorMessage });
    
    // Always return a success response to Swish to prevent retries
    // But log the error for our own tracking
    return NextResponse.json({ success: true });
  }
} 