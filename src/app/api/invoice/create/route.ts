import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendServerInvoiceEmail } from '@/utils/serverEmail';
import { UserInfo, PaymentDetails } from '@/types/booking';
import { generateInvoicePDF } from '@/utils/invoicePDF';
import { generateBookingReference } from '@/utils/booking';
import { generateGiftCardPDF, GiftCardData } from '@/utils/giftCardPDF';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  console.log('=== /api/invoice/create POST handler called ===');
  console.log('Environment:', process.env.NODE_ENV || 'unknown');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('Supabase Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
  
  const startTime = Date.now();
  
  try {
    const data = await request.json();
    const { courseId, userInfo, paymentDetails, amount, product_type } = data;
    
    console.log('Creating invoice for product:', courseId);
    console.log('Product type:', product_type);
    console.log('Payment method:', paymentDetails.method);
    console.log('Amount:', amount);
    console.log('User info:', JSON.stringify(userInfo));
    console.log('Payment details:', JSON.stringify(paymentDetails));
    
    if (!courseId || !userInfo || !paymentDetails) {
      console.error('Missing required data for invoice');
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      );
    }
    
    // Validate payment method
    if (!['invoice', 'swish', 'giftCard'].includes(paymentDetails.method)) {
      console.error('Invalid payment method:', paymentDetails.method);
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
      console.log('=== START ART PRODUCT INVOICE FLOW ===');
      
      try {
        // Get product details from products table
        console.log('1. Fetching art product details from Supabase');
        let productData;
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', courseId)
            .single();
            
          if (error) {
            console.error('Error fetching product:', error);
            throw error;
          }
          
          if (!data) {
            console.error('Product not found with ID:', courseId);
            throw new Error('Product not found');
          }
          
          productData = data;
          console.log('2. Successfully fetched product data:', JSON.stringify(productData));
        } catch (fetchError) {
          console.error('3. Failed to fetch product data:', fetchError);
          return NextResponse.json(
            { success: false, error: 'Product not found or database error' },
            { status: 404 }
          );
        }

        // Generate invoice PDF for art product
        console.log('4. Generating invoice PDF');
        let pdfBlob, pdfBuffer;
        try {
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

          pdfBlob = await generateInvoicePDF(invoiceData);
          pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
          console.log('5. Successfully generated PDF of size:', pdfBuffer.length, 'bytes');
        } catch (pdfError) {
          console.error('6. Error generating PDF:', pdfError);
          return NextResponse.json(
            { success: false, error: 'Failed to generate invoice PDF' },
            { status: 500 }
          );
        }

        // Save PDF to Supabase storage
        console.log('7. Saving art product invoice PDF to Supabase storage');
        try {
          const { error: storageError } = await supabase
            .storage
            .from('invoices')
            .upload(`${invoiceNumber}.pdf`, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (storageError) {
            console.error('8. Error saving PDF to storage:', storageError);
            throw storageError;
          }
          
          console.log('9. Successfully saved PDF to storage');
        } catch (storageError) {
          console.error('10. Failed to save PDF to storage:', storageError);
          return NextResponse.json(
            { success: false, error: 'Failed to save invoice PDF' },
            { status: 500 }
          );
        }

        // Send invoice email
        console.log('11. Sending art product invoice email');
        let emailResult;
        try {
          emailResult = await sendServerInvoiceEmail({
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
            pdfBuffer,
            isProduct: true
          });
          
          console.log('12. Email result:', JSON.stringify(emailResult));
        } catch (emailError) {
          console.error('13. Error sending email:', emailError);
          // Continue even if email fails - we'll still create the order
        }

        // Create art order record
        console.log('14. Creating art order record');
        let orderData;
        try {
          const insertData = {
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
          };
          
          console.log('15. Insert data for art_orders:', JSON.stringify(insertData));
          
          const { data, error } = await supabase
            .from('art_orders')
            .insert(insertData)
            .select()
            .single();

          if (error) {
            console.error('16. Error creating art order:', error);
            throw error;
          }
          
          orderData = data;
          console.log('17. Successfully created art order:', JSON.stringify(orderData));
        } catch (orderError) {
          console.error('18. Failed to create art order:', orderError);
          return NextResponse.json(
            { success: false, error: 'Failed to create art order' },
            { status: 500 }
          );
        }

        console.log('19. Art product invoice process completed successfully');
        console.log(`=== END ART PRODUCT INVOICE FLOW (${Date.now() - startTime}ms) ===`);
        
        // Return success response
        return NextResponse.json({
          success: true,
          orderId: orderData.id,
          invoiceNumber,
          bookingReference,
          emailSent: emailResult?.success || false,
          emailMessage: emailResult?.message || 'No email sent'
        });
      } catch (error) {
        console.error('20. Uncaught error in art product flow:', error);
        console.log(`=== END ART PRODUCT INVOICE FLOW WITH ERROR (${Date.now() - startTime}ms) ===`);
        return NextResponse.json(
          { success: false, error: 'Failed to process art product invoice' },
          { status: 500 }
        );
      }
    }
    else if (courseId === 'gift-card') {
      console.log('=== START GIFT CARD INVOICE FLOW ===');
      
      try {
        // Extract gift card details from localStorage or session data
        const itemDetails = data.itemDetails || {};
        
        console.log('1. Processing gift card with itemDetails:', JSON.stringify(itemDetails));
        
        // Generate a unique code for the gift card
        const generateUniqueCode = () => {
          const random = Math.random().toString(36).substring(2, 10).toUpperCase();
          return `GC-${random}`;
        };
        
        // Create gift card data
        const giftCardCode = generateUniqueCode();
        console.log('2. Generated gift card code:', giftCardCode);
        
        const giftCardData = {
          code: giftCardCode,
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
        
        console.log('3. Gift card data prepared:', JSON.stringify(giftCardData));
        
        // Generate the gift card PDF
        console.log('4. Generating gift card PDF');
        let giftCardPdfBlob, giftCardPdfBuffer;
        try {
          // Prepare gift card data for PDF generation
          const pdfGiftCardData = {
            code: giftCardData.code,
            amount: giftCardData.amount,
            recipientName: giftCardData.recipient_name,
            senderName: giftCardData.sender_name,
            message: giftCardData.message || '',
            expiryDate: new Date(giftCardData.expires_at).toLocaleDateString('sv-SE'),
          };
          
          // Generate the gift card PDF
          giftCardPdfBlob = await generateGiftCardPDF(pdfGiftCardData);
          giftCardPdfBuffer = Buffer.from(await giftCardPdfBlob.arrayBuffer());
          console.log('5. Successfully generated gift card PDF of size:', giftCardPdfBuffer.length, 'bytes');
        } catch (pdfError) {
          console.error('6. Error generating gift card PDF:', pdfError);
          // We'll continue even if PDF generation fails
        }
        
        // Generate the invoice PDF
        console.log('7. Generating invoice PDF for gift card');
        let invoicePdfBlob, invoicePdfBuffer;
        try {
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
          
          invoicePdfBlob = await generateInvoicePDF(invoiceData);
          invoicePdfBuffer = Buffer.from(await invoicePdfBlob.arrayBuffer());
          console.log('8. Successfully generated invoice PDF of size:', invoicePdfBuffer.length, 'bytes');
        } catch (pdfError) {
          console.error('9. Error generating invoice PDF:', pdfError);
          return NextResponse.json(
            { success: false, error: 'Failed to generate invoice PDF' },
            { status: 500 }
          );
        }
        
        // Save PDF to Supabase storage
        console.log('10. Saving gift card invoice PDF to Supabase storage');
        try {
          const { error: storageError } = await supabase
            .storage
            .from('invoices')
            .upload(`${invoiceNumber}.pdf`, invoicePdfBuffer, {
              contentType: 'application/pdf',
              upsert: true
            });
          
          if (storageError) {
            console.error('11. Error saving invoice PDF to storage:', storageError);
            throw storageError;
          }
          
          console.log('12. Successfully saved invoice PDF to storage');
        } catch (storageError) {
          console.error('13. Failed to save invoice PDF to storage:', storageError);
          return NextResponse.json(
            { success: false, error: 'Failed to save invoice PDF' },
            { status: 500 }
          );
        }
        
        // Save gift card PDF if available
        if (giftCardPdfBuffer) {
          console.log('14. Saving gift card PDF to Supabase storage');
          try {
            const { error: giftCardStorageError } = await supabase
              .storage
              .from('gift-cards')
              .upload(`${giftCardCode}.pdf`, giftCardPdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
              });
            
            if (giftCardStorageError) {
              console.error('15. Error saving gift card PDF to storage:', giftCardStorageError);
              // We'll continue even if this fails
            } else {
              console.log('16. Successfully saved gift card PDF to storage');
            }
          } catch (storageError) {
            console.error('17. Failed to save gift card PDF to storage:', storageError);
            // We'll continue even if this fails
          }
        }
        
        // Insert gift card record into database
        console.log('18. Inserting gift card record into database');
        let giftCardResult;
        try {
          console.log('19. Insert data for gift_cards:', JSON.stringify(giftCardData));
          
          const { data, error } = await supabase
            .from('gift_cards')
            .insert([giftCardData])
            .select()
            .single();
          
          if (error) {
            console.error('20. Error creating gift card:', error);
            throw error;
          }
          
          giftCardResult = data;
          console.log('21. Successfully created gift card:', JSON.stringify(giftCardResult));
        } catch (dbError) {
          console.error('22. Failed to insert gift card into database:', dbError);
          return NextResponse.json(
            { success: false, error: 'Failed to create gift card' },
            { status: 500 }
          );
        }
        
        // Send invoice email
        console.log('23. Sending gift card invoice email');
        let emailResult;
        try {
          emailResult = await sendServerInvoiceEmail({
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
            pdfBuffer: invoicePdfBuffer,
            isGiftCard: true,
            giftCardCode: giftCardResult.code,
            giftCardPdfBuffer: giftCardPdfBuffer
          });
          
          console.log('24. Email result:', JSON.stringify(emailResult));
        } catch (emailError) {
          console.error('25. Error sending email:', emailError);
          // Continue even if email fails
        }
        
        console.log('26. Gift card invoice process completed successfully');
        console.log(`=== END GIFT CARD INVOICE FLOW (${Date.now() - startTime}ms) ===`);
        
        return NextResponse.json({
          success: true,
          giftCardId: giftCardResult.id,
          giftCardCode: giftCardResult.code,
          invoiceNumber,
          bookingReference,
          emailSent: emailResult?.success || false,
          emailMessage: emailResult?.message || 'No email sent'
        });
      } catch (error) {
        console.error('27. Uncaught error in gift card flow:', error);
        console.log(`=== END GIFT CARD INVOICE FLOW WITH ERROR (${Date.now() - startTime}ms) ===`);
        return NextResponse.json(
          { success: false, error: 'Failed to process gift card invoice' },
          { status: 500 }
        );
      }
    } else {
      // Original course booking flow
      console.log('=== START COURSE BOOKING INVOICE FLOW ===');
      
      try {
        // Get course details from database
        console.log('1. Fetching course details from Supabase');
        let courseData;
        try {
          const { data, error } = await supabase
            .from('course_instances')
            .select('*')
            .eq('id', courseId)
            .single();
          
          if (error) {
            console.error('2. Error fetching course:', error);
            throw error;
          }
          
          if (!data) {
            console.error('3. Course not found with ID:', courseId);
            throw new Error('Course not found');
          }
          
          courseData = data;
          console.log('4. Successfully fetched course data:', JSON.stringify(courseData));
        } catch (fetchError) {
          console.error('5. Failed to fetch course data:', fetchError);
          return NextResponse.json(
            { success: false, error: 'Course not found or database error' },
            { status: 404 }
          );
        }
        
        // Generate invoice PDF
        console.log('6. Generating invoice PDF');
        let pdfBlob, pdfBuffer;
        try {
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
          
          pdfBlob = await generateInvoicePDF(invoiceData);
          pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
          console.log('7. Successfully generated PDF of size:', pdfBuffer.length, 'bytes');
        } catch (pdfError) {
          console.error('8. Error generating PDF:', pdfError);
          return NextResponse.json(
            { success: false, error: 'Failed to generate invoice PDF' },
            { status: 500 }
          );
        }
        
        // Save PDF to Supabase storage
        console.log('9. Saving PDF to Supabase storage');
        try {
          const { error: storageError } = await supabase
            .storage
            .from('invoices')
            .upload(`${invoiceNumber}.pdf`, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: true
            });
          
          if (storageError) {
            console.error('10. Error saving PDF to storage:', storageError);
            throw storageError;
          }
          
          console.log('11. Successfully saved PDF to storage');
        } catch (storageError) {
          console.error('12. Failed to save PDF to storage:', storageError);
          return NextResponse.json(
            { success: false, error: 'Failed to save invoice PDF' },
            { status: 500 }
          );
        }
        
        // Create booking record with status 'confirmed'
        console.log('13. Creating confirmed booking record for invoice');
        let bookingData;
        try {
          const insertData = {
            course_id: courseId,
            customer_name: `${userInfo.firstName} ${userInfo.lastName}`,
            customer_email: userInfo.email,
            customer_phone: userInfo.phone,
            number_of_participants: parseInt(userInfo.numberOfParticipants) || 1,
            message: userInfo.specialRequirements || null,
            payment_method: paymentDetails.method,
            booking_date: new Date().toISOString(),
            status: 'confirmed',
            payment_status: paymentDetails.method === 'giftCard' ? 'PAID' : 'CREATED',
            booking_reference: bookingReference,
            invoice_number: invoiceNumber,
            invoice_address: paymentDetails.invoiceDetails?.address,
            invoice_postal_code: paymentDetails.invoiceDetails?.postalCode,
            invoice_city: paymentDetails.invoiceDetails?.city,
            invoice_reference: paymentDetails.invoiceDetails?.reference || null,
            unit_price: courseData.price,
            total_price: courseData.price * (parseInt(userInfo.numberOfParticipants) || 1)
          };
          
          console.log('14. Insert data for bookings:', JSON.stringify(insertData));
          
          const { data, error } = await supabase
            .from('bookings')
            .insert(insertData)
            .select()
            .single();
          
          if (error) {
            console.error('15. Error creating booking:', error);
            throw error;
          }
          
          bookingData = data;
          console.log('16. Successfully created booking:', JSON.stringify(bookingData));
        } catch (bookingError) {
          console.error('17. Failed to create booking:', bookingError);
          return NextResponse.json(
            { success: false, error: 'Failed to create booking' },
            { status: 500 }
          );
        }
        
        // Create booking_participants record if needed
        if (
          parseInt(userInfo.numberOfParticipants) > 1 &&
          data.participantDetails &&
          Array.isArray(data.participantDetails) &&
          data.participantDetails.length > 0
        ) {
          console.log('18. Creating booking participants records');
          try {
            const participantsData = data.participantDetails.map((participant: any) => ({
              booking_id: bookingData.id,
              name: participant.name || null,
              email: participant.email || null,
              phone: participant.phone || null,
              age: participant.age || null,
              special_requirements: participant.specialRequirements || null
            }));
            
            console.log('19. Participants data:', JSON.stringify(participantsData));
            
            const { error: participantsError } = await supabase
              .from('booking_participants')
              .insert(participantsData);
            
            if (participantsError) {
              console.error('20. Error creating booking participants:', participantsError);
              // Continue with the booking even if participants creation fails
            } else {
              console.log('21. Successfully created booking participants');
            }
          } catch (participantsError) {
            console.error('22. Failed to create booking participants:', participantsError);
            // Continue with the booking even if participants creation fails
          }
        }
        
        // Send invoice email
        console.log('23. Sending course invoice email');
        let emailResult;
        try {
          emailResult = await sendServerInvoiceEmail({
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
            pdfBuffer
          });
          
          console.log('24. Email result:', JSON.stringify(emailResult));
        } catch (emailError) {
          console.error('25. Error sending email:', emailError);
          // Continue even if email fails
        }
        
        console.log('26. Course booking invoice process completed successfully');
        console.log(`=== END COURSE BOOKING INVOICE FLOW (${Date.now() - startTime}ms) ===`);
        
        return NextResponse.json({
          success: true,
          bookingId: bookingData.id,
          invoiceNumber,
          bookingReference,
          emailSent: emailResult?.success || false,
          emailMessage: emailResult?.message || 'No email sent'
        });
      } catch (error) {
        console.error('27. Uncaught error in course booking flow:', error);
        console.log(`=== END COURSE BOOKING INVOICE FLOW WITH ERROR (${Date.now() - startTime}ms) ===`);
        return NextResponse.json(
          { success: false, error: 'Failed to process course booking invoice' },
          { status: 500 }
        );
      }
    }
    
  } catch (error) {
    console.error('General error creating invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
} 