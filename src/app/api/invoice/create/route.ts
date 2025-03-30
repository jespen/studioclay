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
    const { courseId, userInfo, paymentDetails, amount, product_type } = data;
    
    console.log('Creating invoice for product:', courseId);
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
    
    // Check product type first
    if (product_type === 'art_product') {
      // Get product details from products table
      console.log('Fetching art product details from Supabase');
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (productError || !productData) {
        console.error('Error fetching product:', productError);
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }

      // Generate invoice PDF for art product
      console.log('Generating invoice PDF for art product');
      const invoiceData = {
        customerInfo: userInfo,
        courseDetails: {
          title: productData.title,
          description: productData.description,
          start_date: new Date().toISOString(),
          location: "Studio Clay",
          price: productData.price
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
      const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

      // Save PDF to Supabase storage
      console.log('Saving art product invoice PDF to Supabase storage');
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

      // Send invoice email
      console.log('Sending art product invoice email');
      const emailResult = await sendServerInvoiceEmail({
        userInfo: userInfo as UserInfo,
        paymentDetails: paymentDetails as PaymentDetails,
        courseDetails: {
          id: productData.id,
          title: productData.title,
          description: productData.description,
          start_date: new Date().toISOString(),
          location: "Studio Clay",
          price: productData.price
        },
        invoiceNumber,
        pdfBuffer
      });

      console.log('Art product invoice email sending result:', emailResult);

      // Create art order record
      const { data: orderData, error: orderError } = await supabase
        .from('art_orders')
        .insert({
          product_id: productData.id,
          customer_name: userInfo.firstName + ' ' + userInfo.lastName,
          customer_email: userInfo.email,
          customer_phone: userInfo.phone,
          payment_method: 'invoice',
          order_reference: bookingReference,
          invoice_number: invoiceNumber,
          unit_price: amount,
          total_price: amount,
          status: 'confirmed',
          metadata: {
            user_info: userInfo
          }
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating art order:', orderError);
        throw new Error('Failed to create art order');
      }

      console.log('Created art order:', orderData);

      // Update product stock quantity
      try {
        // First get the current product to check stock_quantity
        const { data: productStockData, error: productFetchError } = await supabase
          .from('products')
          .select('stock_quantity, in_stock')
          .eq('id', productData.id)
          .single();
          
        if (productFetchError) {
          console.error('Error fetching product for stock update:', productFetchError);
          // Continue execution - stock update is not critical for payment process
        } else if (productStockData) {
          // Calculate new stock quantity
          const newQuantity = Math.max(0, (productStockData.stock_quantity || 1) - 1);
          
          // Update the product with new stock quantity
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              stock_quantity: newQuantity,
              in_stock: newQuantity > 0
            })
            .eq('id', productData.id);
            
          if (updateError) {
            console.error('Error updating product stock:', updateError);
          } else {
            console.log(`Updated product ${productData.id} stock to ${newQuantity}`);
          }
        }
      } catch (stockError) {
        console.error('Error in stock quantity update:', stockError);
        // Continue - don't fail the transaction for stock update issues
      }

      return NextResponse.json({
        success: true,
        invoiceNumber,
        bookingReference,
        emailSent: emailResult.success,
        emailMessage: emailResult.message
      });
    } else if (courseId === 'gift-card') {
      console.log('Processing gift card invoice');
      
      // Extract gift card details from localStorage or session data
      const itemDetails = data.itemDetails || {};
      
      console.log('Processing gift card with itemDetails:', itemDetails);
      
      // Generate a unique code for the gift card
      const generateUniqueCode = () => {
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `GC-${random}`;
      };
      
      // Create gift card data
      const giftCardData = {
        code: generateUniqueCode(),
        amount: Number(amount) || Number(itemDetails.amount) || 0,
        type: itemDetails.type || 'digital',
        sender_name: `${userInfo.firstName} ${userInfo.lastName}`,
        sender_email: userInfo.email,
        sender_phone: userInfo.phone || null,
        recipient_name: itemDetails.recipientName || '',
        recipient_email: itemDetails.recipientEmail || null,
        message: itemDetails.message || null,
        invoice_address: paymentDetails.invoiceDetails?.address || null,
        invoice_postal_code: paymentDetails.invoiceDetails?.postalCode || null,
        invoice_city: paymentDetails.invoiceDetails?.city || null,
        invoice_reference: paymentDetails.invoiceDetails?.reference || null,
        payment_reference: invoiceNumber,
        payment_status: 'CREATED',
        status: 'active',
        remaining_balance: Number(amount) || Number(itemDetails.amount) || 0,
        is_emailed: false,
        is_printed: false,
        is_paid: false,
        expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        payment_method: 'invoice',
        invoice_number: invoiceNumber
      };
      
      console.log('Creating gift card with data:', {
        amount: giftCardData.amount,
        recipient_name: giftCardData.recipient_name,
        recipient_email: giftCardData.recipient_email,
        message: giftCardData.message,
        payment_reference: giftCardData.payment_reference,
        invoice_reference: giftCardData.invoice_reference
      });
      
      // Insert gift card into database
      const { data: giftCardResult, error: giftCardError } = await supabase
        .from('gift_cards')
        .insert([giftCardData])
        .select()
        .single();
      
      if (giftCardError) {
        console.error('Error creating gift card:', giftCardError);
        return NextResponse.json(
          { success: false, error: 'Failed to create gift card' },
          { status: 500 }
        );
      }
      
      console.log('Gift card created successfully:', giftCardResult);
      
      // Generate invoice PDF for gift card
      console.log('Generating invoice PDF for gift card');
      const invoiceData = {
        customerInfo: userInfo,
        courseDetails: {
          title: "Presentkort",
          description: `Presentkort på ${giftCardData.amount} kr`,
          start_date: new Date().toISOString(),
          location: "Studio Clay",
          price: giftCardData.amount
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
      console.log('Saving gift card invoice PDF to Supabase storage');
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
      
      // Send invoice email
      console.log('Sending gift card invoice email');
      const emailResult = await sendServerInvoiceEmail({
        userInfo: userInfo as UserInfo,
        paymentDetails: paymentDetails as PaymentDetails,
        courseDetails: {
          id: 'gift-card',
          title: "Presentkort",
          description: `Presentkort på ${giftCardData.amount} kr`,
          start_date: new Date().toISOString(),
          location: "Studio Clay",
          price: giftCardData.amount
        },
        invoiceNumber,
        pdfBuffer
      });
      
      console.log('Gift card invoice email sending result:', emailResult);
      
      return NextResponse.json({
        success: true,
        giftCardId: giftCardResult.id,
        invoiceNumber,
        bookingReference,
        emailSent: emailResult.success,
        emailMessage: emailResult.message
      });
    } else {
      // Original course booking flow
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
      
      // Generate invoice PDF
      console.log('Generating invoice PDF');
      const invoiceData = {
        customerInfo: userInfo,
        courseDetails: {
          title: courseData.title,
          description: courseData.description,
          start_date: courseData.start_date,
          location: courseData.location,
          price: courseData.price
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
          invoice_reference: paymentDetails.invoiceDetails?.reference || null,
          // Add price information
          unit_price: courseData.price,
          total_price: courseData.price * (parseInt(userInfo.numberOfParticipants) || 1)
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
          price: courseData.price
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
    }
    
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
} 