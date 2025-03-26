import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendServerInvoiceEmail } from '@/utils/serverEmail';
import { UserInfo, PaymentDetails } from '@/types/booking';
import { generateInvoicePDF } from '@/utils/invoicePDF';
import { generateBookingReference } from '@/utils/booking';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  console.log('=== /api/invoice/create POST handler called ===');
  
  try {
    const data = await request.json();
    const { courseId, userInfo, paymentDetails } = data;
    
    console.log('Creating invoice for course:', courseId);
    console.log('User info:', userInfo);
    console.log('Payment details:', paymentDetails);
    
    if (!courseId || !userInfo || !paymentDetails) {
      console.error('Missing required data for invoice');
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      );
    }
    
    // Validate payment method
    if (paymentDetails.method !== 'invoice') {
      console.error('Invalid payment method for invoice:', paymentDetails.method);
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      );
    }
    
    // Get course details from database
    console.log('Fetching course details from Supabase');
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
    
    // Generate a unique invoice number (format: SC-YYYYMMDD-XXXX)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `SC-${dateStr}-${randomSuffix}`;
    
    // Generate a unique booking reference using the shared function
    const bookingReference = generateBookingReference();
    
    console.log('Generated invoice number:', invoiceNumber);
    console.log('Generated booking reference:', bookingReference);
    
    // Calculate due date (10 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    const formattedDueDate = dueDate.toLocaleDateString('sv-SE');
    
    // Generate invoice PDF
    console.log('Generating invoice PDF');
    const invoiceData = {
      customerInfo: userInfo,
      courseDetails: {
        title: courseData.title,
        description: courseData.description,
        start_date: courseData.start_date,
        location: courseData.location,
        price: courseData.amount
      },
      invoiceDetails: paymentDetails.invoiceDetails || {
        address: '',
        postalCode: '',
        city: ''
      },
      invoiceNumber,
      dueDate: formattedDueDate
    };
    
    const pdfBlob = await generateInvoicePDF(invoiceData);
    
    // Convert blob to buffer for storage
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
    
    // Save PDF to Supabase storage
    console.log('Saving PDF to Supabase storage');
    const { error: storageError } = await supabase
      .storage
      .from('invoices')
      .upload(`${invoiceNumber}.pdf`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (storageError) {
      console.error('Error saving PDF to storage:', storageError);
      return NextResponse.json(
        { success: false, error: 'Failed to save invoice PDF' },
        { status: 500 }
      );
    }
    
    // Create booking record with status 'confirmed'
    console.log('Creating confirmed booking record for invoice');
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        course_id: courseId,
        customer_name: `${userInfo.firstName} ${userInfo.lastName}`,
        customer_email: userInfo.email,
        customer_phone: userInfo.phone,
        number_of_participants: parseInt(userInfo.numberOfParticipants) || 1,
        message: userInfo.specialRequirements || null,
        payment_method: 'invoice',
        booking_date: new Date().toISOString(),
        status: 'confirmed', // Invoice bookings are confirmed immediately
        payment_status: 'CREATED', // Initial payment status for invoices
        booking_reference: bookingReference,
        // Add invoice details to the booking record
        invoice_number: invoiceNumber,
        invoice_address: paymentDetails.invoiceDetails?.address,
        invoice_postal_code: paymentDetails.invoiceDetails?.postalCode,
        invoice_city: paymentDetails.invoiceDetails?.city,
        invoice_reference: paymentDetails.invoiceDetails?.reference || null
      })
      .select()
      .single();
    
    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { success: false, error: 'Failed to create booking' },
        { status: 500 }
      );
    }
    
    console.log('Booking created successfully:', bookingData);
    
    // Update course current_participants count
    const participantCount = parseInt(userInfo.numberOfParticipants) || 1;
    console.log(`Updating course ${courseId} participants count by adding ${participantCount}`);
    
    // Calculate new participant count
    const currentCount = courseData.current_participants || 0;
    const newCount = currentCount + participantCount;
    
    console.log(`Updating participant count from ${currentCount} to ${newCount}`);
    
    // Check if course would be overbooked
    if (courseData.max_participants && newCount > courseData.max_participants) {
      console.warn(`Warning: Course may be overbooked. Max: ${courseData.max_participants}, New count: ${newCount}`);
    }
    
    // Update the count in the database
    const { error: participantError } = await supabase
      .from('course_instances')
      .update({ current_participants: newCount })
      .eq('id', courseId);
      
    if (participantError) {
      console.error('Error updating participant count:', participantError);
      // Don't continue if participant count update fails
      throw participantError;
    }
    
    console.log('Successfully updated course participant count');
    
    // Send invoice email
    console.log('Sending invoice email');
    const emailResult = await sendServerInvoiceEmail({
      userInfo: userInfo as UserInfo,
      paymentDetails: paymentDetails as PaymentDetails,
      courseDetails: {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description,
        start_date: courseData.start_date,
        location: courseData.location,
        price: courseData.amount
      },
      invoiceNumber,
      pdfBuffer // Pass the PDF buffer to the email function
    });
    
    console.log('Invoice email sending result:', emailResult);
    
    return NextResponse.json({
      success: true,
      bookingId: bookingData.id,
      invoiceNumber,
      bookingReference,
      emailSent: emailResult.success,
      emailMessage: emailResult.message
    });
    
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
} 