import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBookingReference } from '@/utils/booking';
import { sendServerBookingConfirmationEmail } from '@/utils/serverEmail';
import { SwishCallbackData, SwishPaymentStatus } from '@/types/payment';
import { PaymentStatus } from '@/types/booking';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  console.log('=== /api/payments/callback POST handler called ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const data: SwishCallbackData = await request.json();
    console.log('Swish callback data received:', data);

    const paymentReference = data.payeePaymentReference;
    const status: SwishPaymentStatus = data.status;
    
    console.log('Processing payment:', {
      reference: paymentReference,
      status
    });
    
    if (!paymentReference) {
      console.error('Missing payment reference in Swish callback');
      return NextResponse.json(
        { success: false, error: 'Missing payment reference' },
        { status: 400 }
      );
    }

    // Find the payment record
    console.log('Finding payment record for reference:', paymentReference);
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', paymentReference)
      .single();

    if (paymentError || !paymentData) {
      console.error('Error finding payment:', paymentError);
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    console.log('Found payment record:', {
      id: paymentData.id,
      status: paymentData.status,
      amount: paymentData.amount,
      bookingId: paymentData.booking_id,
      courseId: paymentData.course_instance_id
    });

    // Update payment status from Swish
    console.log('Updating payment status from', paymentData.status, 'to', status);
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', paymentData.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update payment' },
        { status: 500 }
      );
    }
    
    console.log('Payment status updated successfully');

    // If there's an existing booking, update its payment_status
    if (paymentData.booking_id && status === 'PAID') {
      console.log('Updating existing booking payment status to PAID');
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ payment_status: 'PAID' })
        .eq('id', paymentData.booking_id);

      if (bookingUpdateError) {
        console.error('Error updating booking payment status:', bookingUpdateError);
        // Log error but continue, as the payment status is already updated
      } else {
        console.log('Booking payment status updated successfully');
      }
    }

    // If payment is PAID and no booking exists yet, create booking and update course participants
    if (status === 'PAID' && !paymentData.booking_id) {
      console.log('Payment is PAID and no booking exists, creating booking now');

      try {
        // Get customer information from pending_bookings
        console.log('Fetching customer information from pending_bookings for payment ID:', paymentData.id);
        const { data: pendingBooking, error: pendingBookingError } = await supabase
          .from('pending_bookings')
          .select('*')
          .eq('payment_id', paymentData.id)
          .single();

        if (pendingBookingError || !pendingBooking) {
          console.error('Error fetching pending booking data:', pendingBookingError);
          console.error('This might happen if the pending_bookings record is missing');
          throw new Error('Failed to fetch customer information: ' + (pendingBookingError?.message || 'No pending booking found'));
        }

        console.log('Found pending booking data:', {
          customerName: pendingBooking.customer_name,
          participants: pendingBooking.number_of_participants
        });

        // Get course details
        console.log('Fetching course details for ID:', paymentData.course_instance_id);
        const { data: courseData, error: courseError } = await supabase
          .from('course_instances')
          .select('*')
          .eq('id', paymentData.course_instance_id)
          .single();

        if (courseError || !courseData) {
          console.error('Error fetching course:', courseError);
          throw new Error('Course not found: ' + (courseError?.message || 'No course found'));
        }

        console.log('Found course:', {
          id: courseData.id,
          title: courseData.title,
          currentParticipants: courseData.current_participants,
          maxParticipants: courseData.max_participants
        });

        // Create booking record
        const bookingReference = generateBookingReference();
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            course_id: courseData.id,
            customer_name: pendingBooking.customer_name,
            customer_email: pendingBooking.customer_email,
            customer_phone: pendingBooking.customer_phone,
            number_of_participants: pendingBooking.number_of_participants,
            message: pendingBooking.message,
            payment_method: 'swish',
            booking_date: new Date().toISOString(),
            status: 'confirmed',
            payment_status: 'PAID',
            booking_reference: bookingReference
          })
          .select()
          .single();

        if (bookingError) {
          console.error('Error creating booking:', bookingError);
          throw new Error('Failed to create booking: ' + bookingError.message);
        }

        console.log('Booking created successfully:', {
          id: bookingData.id,
          reference: bookingReference,
          courseId: bookingData.course_id
        });

        // Link booking to payment
        console.log('Linking booking to payment');
        const { error: linkError } = await supabase
          .from('payments')
          .update({ booking_id: bookingData.id })
          .eq('id', paymentData.id);

        if (linkError) {
          console.error('Error linking booking to payment:', linkError);
          throw new Error('Failed to link booking to payment: ' + linkError.message);
        }
        
        console.log('Booking linked to payment successfully');

        // Update course participants count
        const participantCount = pendingBooking.number_of_participants || 1;
        const currentCount = courseData.current_participants || 0;
        const newCount = currentCount + participantCount;

        console.log('Updating course participants:', {
          courseId: courseData.id,
          currentCount,
          adding: participantCount,
          newCount
        });

        const { error: participantError } = await supabase
          .from('course_instances')
          .update({ current_participants: newCount })
          .eq('id', paymentData.course_instance_id);

        if (participantError) {
          console.error('Error updating participant count:', participantError);
          throw new Error('Failed to update course participants: ' + participantError.message);
        }
        
        console.log('Course participant count updated successfully');

        // Clean up pending_bookings record
        console.log('Cleaning up pending_bookings record for payment ID:', paymentData.id);
        const { error: deleteError } = await supabase
          .from('pending_bookings')
          .delete()
          .eq('payment_id', paymentData.id);
          
        if (deleteError) {
          console.error('Error deleting pending booking record:', deleteError);
          // Don't throw here, this is just cleanup and not critical
        } else {
          console.log('Successfully deleted pending_bookings record');
        }

        // Send confirmation email
        try {
          console.log('Sending confirmation email');
          
          // Parse customer name into first and last name
          const nameParts = pendingBooking.customer_name.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          await sendServerBookingConfirmationEmail({
            bookingReference,
            courseDetails: {
              id: courseData.id,
              title: courseData.title,
              description: courseData.description,
              start_date: courseData.start_date,
              location: courseData.location,
              price: courseData.amount
            },
            userInfo: {
              email: pendingBooking.customer_email,
              firstName: firstName,
              lastName: lastName,
              phone: pendingBooking.customer_phone,
              numberOfParticipants: pendingBooking.number_of_participants.toString()
            },
            paymentDetails: {
              method: 'swish',
              paymentReference: paymentReference,
              paymentStatus: status
            }
          });
          console.log('Confirmation email sent successfully');
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          // Don't throw here, email is not critical for booking creation
        }
        
        return NextResponse.json({ 
          success: true, 
          status,
          message: 'Payment confirmed and booking created',
          booking: {
            id: bookingData.id,
            reference: bookingReference
          }
        });
      } catch (bookingError) {
        console.error('Error in booking creation process:', bookingError);
        return NextResponse.json(
          { success: false, error: bookingError instanceof Error ? bookingError.message : 'Failed to create booking' },
          { status: 500 }
        );
      }
    } else if (status === 'PAID' && paymentData.booking_id) {
      console.log('Payment already has booking, skipping booking creation');
    } else {
      console.log('Payment status is not PAID or booking already exists, no action needed');
    }

    return NextResponse.json({ 
      success: true, 
      status,
      message: status === 'PAID' && !paymentData.booking_id 
        ? 'Payment confirmed and booking created' 
        : 'Payment status updated'
    });
    
  } catch (error) {
    console.error('Error in callback handler:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 