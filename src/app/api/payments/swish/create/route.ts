import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSwishPayment } from '@/utils/swish';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  console.log('[' + new Date().toISOString() + '] Creating Swish Payment');
  
  try {
    const data = await request.json();
    const { courseId, userInfo, phoneNumber } = data;
    
    console.log('Details:', { courseId, phoneNumber });
    
    if (!courseId || !phoneNumber || !userInfo) {
      console.error('Missing required data:', { courseId, phoneNumber, userInfo: !!userInfo });
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      );
    }
    
    // Get course details
    console.log('Fetching course details for ID:', courseId);
    const { data: courseData, error: courseError } = await supabase
      .from('course_instances')
      .select('*')
      .eq('id', courseId)
      .single();
    
    if (courseError || !courseData) {
      console.error('Error fetching course:', courseError);
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Generate a unique payment reference
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const paymentReference = `SWISH-${dateStr}-${randomSuffix}`;
    
    // Calculate total amount based on number of participants
    const numberOfParticipants = parseInt(userInfo.numberOfParticipants) || 1;
    const totalAmount = courseData.amount * numberOfParticipants;
    
    // Create payment record with only payment-related fields
    console.log('Creating payment record with amount:', totalAmount);
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        course_instance_id: courseId,
        amount: totalAmount,
        payment_reference: paymentReference,
        status: 'CREATED',
        payment_method: 'swish',
        phone_number: phoneNumber
      })
      .select()
      .single();
    
    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return NextResponse.json(
        { success: false, error: 'Failed to create payment' },
        { status: 500 }
      );
    }
    
    console.log('Payment record created:', {
      id: paymentData.id,
      reference: paymentReference
    });
    
    // Store customer information in pending_bookings
    console.log('Storing customer information in pending_bookings for payment ID:', paymentData.id);
    console.log('Customer data:', {
      name: `${userInfo.firstName} ${userInfo.lastName}`,
      email: userInfo.email,
      phone: userInfo.phone,
      participants: numberOfParticipants,
      hasMessage: !!userInfo.specialRequirements
    });
    
    const { data: pendingData, error: pendingBookingError } = await supabase
      .from('pending_bookings')
      .insert({
        payment_id: paymentData.id,
        customer_name: `${userInfo.firstName} ${userInfo.lastName}`,
        customer_email: userInfo.email,
        customer_phone: userInfo.phone,
        number_of_participants: numberOfParticipants,
        message: userInfo.specialRequirements || null
      })
      .select();
    
    if (pendingBookingError) {
      console.error('Error storing customer information:', pendingBookingError);
      // We'll continue anyway since the payment is created
    } else {
      console.log('Customer information stored in pending_bookings with ID:', pendingData?.[0]?.id);
    }
    
    // Create Swish payment request
    console.log('Creating Swish payment with phone:', phoneNumber);
    const swishResult = await createSwishPayment({
      paymentReference,
      phoneNumber,
      amount: totalAmount,
      message: `Bokning: ${courseData.title}`,
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/callback`
    });
    
    if (!swishResult.success) {
      console.error('Error creating Swish payment:', swishResult.error);
      return NextResponse.json(
        { success: false, error: swishResult.error },
        { status: 500 }
      );
    }
    
    console.log('Swish payment created successfully with ID:', swishResult.paymentId);
    
    // Update payment record with Swish payment ID
    if (swishResult.paymentId) {
      await supabase
        .from('payments')
        .update({ swish_payment_id: swishResult.paymentId })
        .eq('id', paymentData.id);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        reference: paymentReference
      }
    });
    
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    );
  }
} 