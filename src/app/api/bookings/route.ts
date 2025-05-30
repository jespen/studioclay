import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for bookings
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const statusFilter = searchParams.get('status');
    
    let query = supabaseAdmin.from('bookings').select(`
      *,
      course:course_instances (
        *,
        template:course_templates (
          *,
          category:categories (*)
        )
      )
    `);
    
    // Filter by course ID if provided
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    // Apply status filter if provided
    if (statusFilter) {
      if (statusFilter === 'active') {
        // All statuses except cancelled
        query = query.not('status', 'eq', 'cancelled');
      } else if (statusFilter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      } else if (statusFilter !== 'all') {
        // Specific status filter (confirmed, pending, completed, etc.)
        query = query.eq('status', statusFilter);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Process the data to maintain backward compatibility
    const processedData = (data || []).map((booking: any) => {
      if (booking.course) {
        const template = booking.course.template;
        booking.course = {
          id: booking.course.id,
          template_id: template?.id || booking.course.template_id,
          current_participants: booking.course.current_participants || 0,
          max_participants: template?.max_participants || booking.course.max_participants || 0,
          start_date: booking.course.start_date,
          end_date: booking.course.end_date,
          status: booking.course.status,
          created_at: booking.course.created_at,
          updated_at: booking.course.updated_at,
          template,
          instructor: booking.course.instructor,
          category: booking.course.category
        };
      }
      return booking;
    });
    
    return NextResponse.json({
      bookings: processedData,
      count: processedData.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('=== BOOKING API POST START ===');
    console.log('Raw received body:');
    console.log(JSON.stringify(body, null, 2));
    console.log('Body keys:', Object.keys(body));
    console.log('Body type checks:');
    Object.keys(body).forEach(key => {
      console.log(`  ${key}: ${typeof body[key]} = ${body[key]}`);
    });
    
    // Enhanced validation for required fields
    const missingFields = [];
    
    if (!body.course_id) missingFields.push('course_id');
    if (!body.customer_name?.trim()) missingFields.push('customer_name');
    if (!body.customer_email?.trim()) missingFields.push('customer_email');
    if (!body.number_of_participants || body.number_of_participants < 1) missingFields.push('number_of_participants');
    if (!body.payment_method) missingFields.push('payment_method');
    if (!body.booking_reference) missingFields.push('booking_reference');
    
    // Validate status field (required, NOT NULL in DB)
    if (!body.status) {
      console.log('No status provided, defaulting to "confirmed"');
      body.status = 'confirmed'; // Set default since it's NOT NULL
    }
    
    // Validate payment_status field (required, NOT NULL in DB)
    if (!body.payment_status) {
      console.log('No payment_status provided, defaulting to "CREATED"');
      body.payment_status = 'CREATED'; // Set default since it's NOT NULL
    }
    
    console.log('=== VALIDATION CHECK ===');
    console.log('Missing fields:', missingFields);
    console.log('Payment method:', body.payment_method);
    console.log('Status:', body.status);
    console.log('Payment status:', body.payment_status);
    
    // If payment method is invoice, validate invoice fields
    if (body.payment_method === 'invoice') {
      console.log('=== INVOICE VALIDATION ===');
      console.log('Invoice address:', body.invoice_address);
      console.log('Invoice postal code:', body.invoice_postal_code);
      console.log('Invoice city:', body.invoice_city);
      console.log('Invoice number:', body.invoice_number);
      
      if (!body.invoice_address?.trim()) missingFields.push('invoice_address');
      if (!body.invoice_postal_code?.trim()) missingFields.push('invoice_postal_code');
      if (!body.invoice_city?.trim()) missingFields.push('invoice_city');
      if (!body.invoice_number?.trim()) missingFields.push('invoice_number');
    }
    
    if (missingFields.length > 0) {
      console.error('VALIDATION FAILED - Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          missingFields,
          message: `Required fields missing: ${missingFields.join(', ')}`
        },
        { status: 400 }
      );
    }
    
    console.log('=== VALIDATION PASSED ===');
    
    // First check if the course exists and has available spots
    console.log('Checking course availability for ID:', body.course_id);
    const { data: course, error: courseError } = await supabaseAdmin
      .from('course_instances')
      .select('current_participants, max_participants, price')
      .eq('id', body.course_id)
      .single();
      
    if (courseError) {
      console.error('Error fetching course:', courseError);
      return NextResponse.json(
        { error: 'Course not found', details: courseError.message },
        { status: 404 }
      );
    }
    
    console.log('Course data:', course);
    
    // Validate that course has a price
    if (!course.price || course.price <= 0) {
      return NextResponse.json(
        { error: 'Course price not set or invalid' },
        { status: 400 }
      );
    }
    
    // Check if course is fully booked
    if (course.max_participants !== null && 
        course.current_participants + body.number_of_participants > course.max_participants) {
      console.warn('Course is fully booked:', {
        courseId: body.course_id,
        currentParticipants: course.current_participants,
        maxParticipants: course.max_participants,
        requestedParticipants: body.number_of_participants
      });
      return NextResponse.json(
        { error: 'Course is fully booked', details: 'Not enough available spots' },
        { status: 400 }
      );
    }
    
    // Insert booking in a transaction
    // DISABLED: RPC function not mapping all fields correctly
    // const { data: booking, error: bookingError } = await supabaseAdmin.rpc('create_booking_with_participants', {
    //   booking_data: { ... },
    //   participant_count: body.number_of_participants
    // });
    
    // Force using fallback method since RPC doesn't work properly
    const bookingError = new Error('RPC disabled - using fallback method');
    
    if (bookingError) {
      console.error('Error creating booking with RPC (EXPECTED - RPC disabled):', bookingError.message);
      
      // Fallback to manual booking creation and participant count update
      console.log('=== USING FALLBACK METHOD ===');
      console.log('Raw body data for fallback:');
      console.log(JSON.stringify(body, null, 2));
      
      // Log each field individually to catch any undefined/null issues
      console.log('=== FIELD BY FIELD ANALYSIS ===');
      console.log('course_id:', body.course_id, typeof body.course_id);
      console.log('customer_name:', body.customer_name, typeof body.customer_name);
      console.log('customer_email:', body.customer_email, typeof body.customer_email);
      console.log('customer_phone:', body.customer_phone, typeof body.customer_phone);
      console.log('number_of_participants:', body.number_of_participants, typeof body.number_of_participants);
      console.log('payment_method:', body.payment_method, typeof body.payment_method);
      console.log('payment_status:', body.payment_status, typeof body.payment_status);
      console.log('booking_reference:', body.booking_reference, typeof body.booking_reference);
      console.log('payment_reference:', body.payment_reference, typeof body.payment_reference);
      console.log('unit_price:', body.unit_price, typeof body.unit_price);
      console.log('total_price:', body.total_price, typeof body.total_price);
      console.log('currency:', body.currency, typeof body.currency);
      console.log('status:', body.status, typeof body.status);
      console.log('message:', body.message, typeof body.message);
      console.log('invoice_number:', body.invoice_number, typeof body.invoice_number);
      console.log('invoice_address:', body.invoice_address, typeof body.invoice_address);
      console.log('invoice_postal_code:', body.invoice_postal_code, typeof body.invoice_postal_code);
      console.log('invoice_city:', body.invoice_city, typeof body.invoice_city);
      console.log('invoice_reference:', body.invoice_reference, typeof body.invoice_reference);
      
      // Explicitly map all fields to ensure proper saving - NO FALLBACK VALUES FOR FORM FIELDS
      const bookingRecord = {
        course_id: body.course_id,
        customer_name: body.customer_name.trim(), // NOT NULL field
        customer_email: body.customer_email.trim(), // NOT NULL field
        customer_phone: body.customer_phone, // Form field - should come from frontend
        number_of_participants: body.number_of_participants, // NOT NULL field
        booking_date: body.booking_date || new Date().toISOString(),
        status: body.status, // NOT NULL field, validated above
        payment_status: body.payment_status, // NOT NULL field, validated above
        payment_method: body.payment_method,
        booking_reference: body.booking_reference,
        payment_reference: body.payment_reference,
        unit_price: body.unit_price,
        total_price: body.total_price,
        currency: body.currency,
        message: body.message, // Form field - should come from frontend
        // Invoice details - these are form fields and should come from frontend
        invoice_number: body.invoice_number,
        invoice_address: body.invoice_address,
        invoice_postal_code: body.invoice_postal_code,
        invoice_city: body.invoice_city,
        invoice_reference: body.invoice_reference
      };
      
      console.log('=== FINAL BOOKING RECORD BEFORE INSERT ===');
      console.log('Complete booking record:');
      console.log(JSON.stringify(bookingRecord, null, 2));
      
      // Check for any undefined or null values that might cause issues
      console.log('=== NULL/UNDEFINED CHECK ===');
      Object.keys(bookingRecord).forEach(key => {
        const value = bookingRecord[key as keyof typeof bookingRecord];
        if (value === null || value === undefined) {
          console.log(`WARNING: ${key} is ${value}`);
        } else {
          console.log(`OK: ${key} = ${value} (${typeof value})`);
        }
      });
      
      // Start a transaction
      console.log('=== EXECUTING INSERT ===');
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .insert(bookingRecord)
        .select();
        
      console.log('=== INSERT RESULT ===');
      console.log('Insert data:', JSON.stringify(data, null, 2));
      console.log('Insert error:', error);
        
      if (error) {
        console.error('Error creating booking:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('Booking data that failed:', JSON.stringify(bookingRecord, null, 2));
        
        // Check if it's a constraint violation
        if (error.code === '23505') { // Unique constraint violation
          return NextResponse.json(
            { error: 'Booking reference already exists', details: error.message },
            { status: 409 }
          );
        } else if (error.code === '23514') { // Check constraint violation
          return NextResponse.json(
            { error: 'Invalid data values', details: error.message },
            { status: 400 }
          );
        } else if (error.code === '23502') { // NOT NULL constraint violation
          return NextResponse.json(
            { error: 'Required field is missing', details: error.message },
            { status: 400 }
          );
        }
        
        throw error;
      }
      
      console.log('Booking created successfully with fallback method:', data?.[0]);
      
      // Update course participant count - only for confirmed bookings
      // Pending bookings (waitlist) should NOT count towards current_participants
      if (body.status === 'confirmed') {
        const { error: updateError } = await supabaseAdmin
          .from('course_instances')
          .update({ 
            current_participants: course.current_participants + body.number_of_participants 
          })
          .eq('id', body.course_id);
          
        if (updateError) {
          console.error('Error updating course participants:', updateError);
          // We don't want to fail the booking if only the participant count update fails
          // Just log the error and continue
        } else {
          console.log('Updated course participants for confirmed booking:', {
            courseId: body.course_id,
            oldCount: course.current_participants,
            addedParticipants: body.number_of_participants,
            newCount: course.current_participants + body.number_of_participants
          });
        }
      } else {
        console.log('Booking status is not confirmed, not updating current_participants:', {
          status: body.status,
          courseId: body.course_id
        });
      }
      
      return NextResponse.json({
        booking: data?.[0] || null,
        status: 'success',
        message: 'Booking created successfully'
      });
    }
    
    // This code is no longer reachable since we always use fallback method
    // console.log('Booking created successfully with RPC:', booking);
    
    // return NextResponse.json({
    //   booking: booking,
    //   status: 'success',
    //   message: 'Booking created successfully'
    // });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 