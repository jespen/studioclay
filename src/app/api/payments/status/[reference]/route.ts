import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkSwishPaymentStatus } from '../../../../../utils/swish';
import {
  logOperation,
  logError,
  createSuccessResponse,
  handleDatabaseError,
  handleValidationError
} from '@/utils/apiUtils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: Request,
  context: { params: { reference: string } }
) {
  try {
    const reference = await Promise.resolve(context.params.reference);
    
    if (!reference) {
      return handleValidationError('Missing payment reference');
    }

    console.log('Checking status for payment reference:', reference);

    // Get payment record with swish_payment_id
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, status, booking_id, phone_number, user_info, course_instance_id, swish_payment_id')
      .eq('payment_reference', reference)
      .single();
    
    if (paymentError) {
      return handleDatabaseError(paymentError, 'Fetching payment record');
    }

    if (!payment) {
      return handleValidationError('Payment not found');
    }

    logOperation('Payment Record Found', {
      paymentId: payment.id,
      status: payment.status,
      swishPaymentId: payment.swish_payment_id
    });

    // If we're in development/test mode, check Swish status using the Swish payment ID
    if (process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true' && payment.swish_payment_id) {
      console.log('Test mode detected, checking Swish payment status from test environment');
      const swishStatus = await checkSwishPaymentStatus(payment.swish_payment_id);
      
      console.log('Swish test status check result:', swishStatus);
      
      if (swishStatus.success && swishStatus.status !== payment.status) {
        console.log('Status differs, updating from', payment.status, 'to', swishStatus.status);
        
        // Update payment status in database
        const { error: updateError } = await supabase
          .from('payments')
          .update({ status: swishStatus.status })
          .eq('id', payment.id);

        if (!updateError) {
          console.log('Payment status updated successfully in database');
          payment.status = swishStatus.status;
          
          // If status changed to PAID and there's no booking, trigger the callback handler directly
          if (swishStatus.status === 'PAID' && !payment.booking_id) {
            console.log('Status changed to PAID, triggering callback handler directly');
            
            try {
              // Get base URL with fallback to localhost
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
              const callbackUrl = `${baseUrl}/api/payments/callback`;
              
              console.log('Triggering callback to:', callbackUrl);
              console.log('With payment reference:', reference);
              
              // Call our callback endpoint directly with the same data structure Swish would send
              const callbackResponse = await fetch(callbackUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  payeePaymentReference: reference,
                  status: 'PAID',
                  currency: 'SEK'
                })
              });
              
              if (callbackResponse.ok) {
                console.log('Callback handler successfully triggered');
                const responseData = await callbackResponse.json();
                console.log('Callback response:', responseData);
                
                // If booking was created, include it in the response
                if (responseData.booking) {
                  console.log('Booking created with ID:', responseData.booking.id);
                  
                  // Fetch the booking data
                  const { data: bookingData } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('id', responseData.booking.id)
                    .single();
                    
                  if (bookingData) {
                    console.log('Including booking data in response');
                    return createSuccessResponse({
                      success: true,
                      payment: {
                        id: payment.id,
                        status: payment.status,
                        reference: reference,
                        booking_id: responseData.booking.id,
                        phone_number: payment.phone_number,
                        user_info: payment.user_info,
                        course_instance_id: payment.course_instance_id
                      },
                      booking: bookingData
                    });
                  }
                }
              } else {
                console.error('Failed to trigger callback handler:', await callbackResponse.text());
              }
            } catch (callbackError) {
              console.error('Error triggering callback handler:', callbackError);
            }
          }
        } else {
          console.error('Failed to update payment status in database:', updateError);
        }
      }
    }

    // Get booking details if exists
    let booking = null;
    if (payment.booking_id) {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', payment.booking_id)
        .single();
      
      if (bookingData) {
        booking = bookingData;
      }
    }

    return createSuccessResponse({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        reference: reference,
        booking_id: payment.booking_id,
        phone_number: payment.phone_number,
        user_info: payment.user_info,
        course_instance_id: payment.course_instance_id
      },
      booking: booking
    });

  } catch (error) {
    logError(error, 'Payment status check');
    return handleDatabaseError(error, 'Error checking payment status');
  }
} 