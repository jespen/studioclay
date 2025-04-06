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
    
    // Generate a unique invoice number and booking reference
    // Do this early since we need these for both early response and later processing
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `SC-${dateStr}-${randomSuffix}`;
    
    // Generate a unique booking reference
    const bookingReference = generateBookingReference();
    
    console.log('Generated invoice number:', invoiceNumber);
    console.log('Generated booking reference:', bookingReference);
    
    // Calculate due date (10 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    const formattedDueDate = dueDate.toLocaleDateString('sv-SE');
    
    // CRITICAL DATABASE OPERATIONS - Do these before any PDF generation or email sending
    
    // Store different data based on product type
    let databaseResponse = null;
    let pdfBlob = null;
    let pdfBuffer = null;
    let responseData: {
      success: boolean;
      invoiceNumber: string;
      bookingReference: string;
      id?: string;
      giftCardId?: string;
      giftCardCode?: string;
    } = {
      success: true,
      invoiceNumber,
      bookingReference
    };
    
    if (product_type === 'art_product') {
      console.log('=== PERFORMING CRITICAL DB OPERATIONS FOR ART PRODUCT ===');
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

        // IMPORTANT: Create art order record FIRST, before generating PDF
        // This ensures the order record is saved even if PDF generation or email sending fails
        console.log('4. Creating art order record FIRST');
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
              user_info: {
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                email: userInfo.email,
                phone: userInfo.phone
              },
              invoice_details: paymentDetails.invoiceDetails
            }
          };
          
          const { data: orderData, error: orderError } = await supabase
            .from('art_orders')
            .insert(insertData)
            .select()
            .single();
            
          if (orderError) {
            console.error('5. Error creating art order:', orderError);
            throw orderError;
          }
          
          console.log('6. Successfully created art order:', orderData?.id);
          databaseResponse = orderData;
          responseData.id = orderData?.id;
          
          // Update product stock quantity
          try {
            console.log('7. Updating product stock quantity');
            // Decrease the quantity of the product by 1
            const { data: updatedProduct, error: updateError } = await supabase
              .from('products')
              .update({ 
                stock_quantity: productData.stock_quantity ? productData.stock_quantity - 1 : 0 
              })
              .eq('id', productData.id)
              .select()
              .single();
              
            if (updateError) {
              console.error('Error updating product stock:', updateError);
              // Continue even if product stock update fails - we'll log but not fail the transaction
            } else {
              console.log('Successfully updated product stock quantity to:', updatedProduct?.stock_quantity);
            }
          } catch (stockError) {
            console.error('Failed to update product stock:', stockError);
            // Continue even if stock update fails
          }
        } catch (dbError) {
          console.error('8. Failed to create art order record:', dbError);
          return NextResponse.json(
            { success: false, error: 'Failed to create order record' },
            { status: 500 }
          );
        }
        
        // SEND IMMEDIATE RESPONSE TO CLIENT
        // Return success to the client immediately after creating the database record
        // This prevents timeout errors
        console.log('9. Sending immediate response to client, time elapsed:', Date.now() - startTime, 'ms');
        
        // CONTINUE PROCESSING IN THE BACKGROUND
        // The code below will continue executing but won't block the response
        
        // Start asynchronous PDF generation and email sending
        // This is "fire and forget" - we don't await this Promise
        (async () => {
          try {
            console.log('10. Starting background PDF generation and email sending');
            const backgroundStartTime = Date.now();
            
            // Generate invoice PDF for art product
            console.log('11. Generating invoice PDF in background');
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
              console.log('12. Successfully generated PDF of size:', pdfBuffer.length, 'bytes, time:', Date.now() - backgroundStartTime, 'ms');
            } catch (pdfError) {
              console.error('13. Error generating PDF in background:', pdfError);
              // Continue to next steps even if PDF generation fails
            }

            if (pdfBuffer) {
              // Save PDF to Supabase storage
              console.log('14. Saving art product invoice PDF to Supabase storage');
              try {
                const { error: storageError } = await supabase
                  .storage
                  .from('invoices')
                  .upload(`${invoiceNumber}.pdf`, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true
                  });

                if (storageError) {
                  console.error('15. Error saving PDF to storage:', storageError);
                } else {
                  console.log('16. Successfully saved PDF to storage, time:', Date.now() - backgroundStartTime, 'ms');
                }
              } catch (storageError) {
                console.error('17. Failed to save PDF to storage:', storageError);
                // Continue to next steps even if storage fails
              }

              // Send invoice email
              console.log('18. Sending art product invoice email in background');
              try {
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
                  pdfBuffer,
                  isProduct: true
                });
                
                console.log('19. Email result:', JSON.stringify(emailResult), 'time:', Date.now() - backgroundStartTime, 'ms');
              } catch (emailError) {
                console.error('20. Error sending email in background:', emailError);
                // Continue even if email fails
              }
            }
            
            console.log('21. Background processing completed, total time:', Date.now() - backgroundStartTime, 'ms');
          } catch (backgroundError) {
            console.error('Background processing error:', backgroundError);
          }
        })();
        
        // Return the success response to the client
        return NextResponse.json(responseData);
      } catch (error) {
        console.error('Art product invoice creation failed:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to create invoice' },
          { status: 500 }
        );
      }
    } else if (product_type === 'gift_card') {
      console.log('=== PERFORMING CRITICAL DB OPERATIONS FOR GIFT CARD ===');
      try {
        const { itemDetails } = data;
        console.log('Gift card details:', JSON.stringify(itemDetails || {}));
        
        if (!itemDetails) {
          console.error('No gift card details provided');
          return NextResponse.json(
            { success: false, error: 'Gift card details are required' },
            { status: 400 }
          );
        }

        // Generate a unique gift card code
        const giftCardCode = `GC-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
        console.log('Generated gift card code:', giftCardCode);
        responseData.giftCardCode = giftCardCode;
        
        // IMPORTANT: Insert gift card record into the database FIRST
        // This ensures we have a gift card entry even if PDF generation fails
        console.log('1. Creating gift card record FIRST');
        
        // Create expiry date (1 year from now)
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        
        // Prepare gift card data
        const giftCardData = {
          code: giftCardCode,
          amount: parseFloat(itemDetails.amount || amount),
          type: itemDetails.type || 'digital',
          sender_name: userInfo.firstName + ' ' + userInfo.lastName,
          sender_email: userInfo.email,
          sender_phone: userInfo.phone || '',
          recipient_name: itemDetails.recipientName || '',
          recipient_email: itemDetails.recipientEmail || '',
          message: itemDetails.message || '',
          payment_reference: invoiceNumber,
          payment_status: 'CREATED',
          expires_at: expiryDate.toISOString(),
          is_paid: false,
          payment_method: 'invoice'
        };
        
        console.log('2. Gift card data prepared:', JSON.stringify(giftCardData));
        
        try {
          const { data: giftCardRecord, error: insertError } = await supabase
            .from('gift_cards')
            .insert(giftCardData)
            .select()
            .single();
            
          if (insertError) {
            console.error('3. Error creating gift card record:', insertError);
            throw insertError;
          }
          
          console.log('4. Successfully created gift card record:', giftCardRecord?.id);
          databaseResponse = giftCardRecord;
          responseData.giftCardId = giftCardRecord?.id;
          
          // SEND IMMEDIATE RESPONSE TO CLIENT
          // Return success to the client immediately after creating the database record
          // This prevents timeout errors
          console.log('5. Sending immediate response to client, time elapsed:', Date.now() - startTime, 'ms');
          
          // CONTINUE PROCESSING IN THE BACKGROUND
          // The code below will continue executing but won't block the response
          
          // Start asynchronous PDF generation and email sending
          // This is "fire and forget" - we don't await this Promise
          (async () => {
            try {
              console.log('6. Starting background PDF generation and email sending');
              const backgroundStartTime = Date.now();
              
              // Generate gift card PDF
              console.log('7. Generating gift card PDF in background');
              try {
                const giftCardPdfData: GiftCardData = {
                  recipientName: itemDetails.recipientName || 'Presentkortsmottagare',
                  senderName: userInfo.firstName + ' ' + userInfo.lastName,
                  amount: parseFloat(itemDetails.amount || amount),
                  message: itemDetails.message || '',
                  code: giftCardCode,
                  expiryDate: expiryDate.toLocaleDateString('sv-SE'),
                  createdAt: new Date().toLocaleDateString('sv-SE')
                };
                
                pdfBlob = await generateGiftCardPDF(giftCardPdfData);
                pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
                console.log('8. Successfully generated PDF of size:', pdfBuffer.length, 'bytes, time:', Date.now() - backgroundStartTime, 'ms');
              } catch (pdfError) {
                console.error('9. Error generating PDF in background:', pdfError);
                // Continue to next steps even if PDF generation fails
              }
              
              if (pdfBuffer) {
                // Save PDF to Supabase storage
                console.log('10. Saving gift card PDF to Supabase storage');
                try {
                  const { error: storageError } = await supabase
                    .storage
                    .from('giftcards')
                    .upload(`gift-card-${giftCardCode}.pdf`, pdfBuffer, {
                      contentType: 'application/pdf',
                      upsert: true
                    });
                    
                  if (storageError) {
                    console.error('11. Error saving PDF to storage:', storageError);
                  } else {
                    console.log('12. Successfully saved PDF to storage, time:', Date.now() - backgroundStartTime, 'ms');
                  }
                } catch (storageError) {
                  console.error('13. Failed to save PDF to storage:', storageError);
                  // Continue to next steps even if storage fails
                }
                
                // Send gift card email with invoice information
                console.log('14. Sending gift card invoice email in background');
                try {
                  const emailResult = await sendServerInvoiceEmail({
                    userInfo: userInfo as UserInfo,
                    paymentDetails: paymentDetails as PaymentDetails,
                    courseDetails: {
                      id: 'gift-card',
                      title: `Presentkort ${parseFloat(itemDetails.amount || amount)} kr`,
                      description: itemDetails.message || '',
                      start_date: new Date().toISOString(),
                      location: "Studio Clay",
                      price: parseFloat(itemDetails.amount || amount)
                    },
                    invoiceNumber,
                    pdfBuffer,
                    isGiftCard: true,
                    giftCardCode
                  });
                  
                  // If recipient email exists in itemDetails, send another email to them
                  if (itemDetails.recipientEmail) {
                    // Additional email to recipient can be sent here if needed
                    console.log('Recipient email exists, could send additional email to:', itemDetails.recipientEmail);
                  }
                  
                  console.log('15. Email result:', JSON.stringify(emailResult), 'time:', Date.now() - backgroundStartTime, 'ms');
                } catch (emailError) {
                  console.error('16. Error sending email in background:', emailError);
                  // Continue even if email fails
                }
              }
              
              console.log('17. Background processing completed, total time:', Date.now() - backgroundStartTime, 'ms');
            } catch (backgroundError) {
              console.error('Background processing error:', backgroundError);
            }
          })();
          
          // Return the success response to the client
          return NextResponse.json(responseData);
        } catch (dbError) {
          console.error('Failed to create gift card record:', dbError);
          return NextResponse.json(
            { success: false, error: 'Failed to create gift card record' },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error('Gift card invoice creation failed:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to create gift card invoice' },
          { status: 500 }
        );
      }
    } else if (product_type === 'course') {
      console.log('=== PERFORMING CRITICAL DB OPERATIONS FOR COURSE ===');
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

        // IMPORTANT: Create booking record FIRST, before any PDF generation
        console.log('6. Creating confirmed booking record for invoice');
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
            payment_status: 'CREATED',
            booking_reference: bookingReference,
            invoice_number: invoiceNumber,
            invoice_address: paymentDetails.invoiceDetails?.address,
            invoice_postal_code: paymentDetails.invoiceDetails?.postalCode,
            invoice_city: paymentDetails.invoiceDetails?.city,
            invoice_reference: paymentDetails.invoiceDetails?.reference || null,
            unit_price: courseData.price,
            total_price: courseData.price * (parseInt(userInfo.numberOfParticipants) || 1)
          };
          
          console.log('7. Insert data for bookings:', JSON.stringify(insertData));
          
          const { data, error } = await supabase
            .from('bookings')
            .insert(insertData)
            .select()
            .single();
          
          if (error) {
            console.error('8. Error creating booking:', error);
            throw error;
          }
          
          bookingData = data;
          console.log('9. Successfully created booking:', bookingData?.id);
          databaseResponse = bookingData;
          responseData.id = bookingData?.id;
          
          // Update the current_participants count in the course_instances table
          console.log('9a. Updating current_participants in course_instances table');
          const participantsToAdd = parseInt(userInfo.numberOfParticipants) || 1;
          
          try {
            // First get the current participants count
            const { data: courseBeforeUpdate, error: getCourseError } = await supabase
              .from('course_instances')
              .select('current_participants, max_participants')
              .eq('id', courseId)
              .single();
              
            if (getCourseError) {
              console.error('9b. Error getting current course data:', getCourseError);
              // Continue with the booking process even if updating participants fails
            } else {
              // Calculate new participants count
              const currentParticipants = courseBeforeUpdate.current_participants || 0;
              const newParticipantsCount = currentParticipants + participantsToAdd;
              
              console.log('9c. Current participants:', currentParticipants);
              console.log('9d. Adding participants:', participantsToAdd);
              console.log('9e. New participants count:', newParticipantsCount);
              
              // Update the course_instances record
              const { data: updatedCourse, error: updateError } = await supabase
                .from('course_instances')
                .update({ 
                  current_participants: newParticipantsCount
                })
                .eq('id', courseId)
                .select()
                .single();
                
              if (updateError) {
                console.error('9f. Error updating course participants:', updateError);
                // Continue with the booking process even if updating participants fails
              } else {
                console.log('9g. Successfully updated course participants:', updatedCourse.current_participants);
              }
            }
          } catch (participantsError) {
            console.error('9h. Unexpected error updating course participants:', participantsError);
            // Continue with the booking process even if updating participants fails
          }
        } catch (bookingError) {
          console.error('10. Failed to create booking:', bookingError);
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
          console.log('11. Creating booking participants records');
          try {
            const participantsData = data.participantDetails.map((participant: any) => ({
              booking_id: bookingData.id,
              name: participant.name || null,
              email: participant.email || null,
              phone: participant.phone || null,
              age: participant.age || null,
              special_requirements: participant.specialRequirements || null
            }));
            
            console.log('12. Participants data:', JSON.stringify(participantsData));
            
            const { error: participantsError } = await supabase
              .from('booking_participants')
              .insert(participantsData);
            
            if (participantsError) {
              console.error('13. Error creating booking participants:', participantsError);
              // Continue with the booking even if participants creation fails
            } else {
              console.log('14. Successfully created booking participants');
            }
          } catch (participantsError) {
            console.error('15. Failed to create booking participants:', participantsError);
            // Continue with the booking even if participants creation fails
          }
        }
        
        // SEND IMMEDIATE RESPONSE TO CLIENT
        // Return success to the client immediately after creating the database record
        // This prevents timeout errors
        console.log('16. Sending immediate response to client, time elapsed:', Date.now() - startTime, 'ms');
        
        // CONTINUE PROCESSING IN THE BACKGROUND
        // The code below will continue executing but won't block the response
        
        // Start asynchronous PDF generation and email sending
        // This is "fire and forget" - we don't await this Promise
        (async () => {
          try {
            console.log('17. Starting background PDF generation and email sending');
            const backgroundStartTime = Date.now();
            
            // Generate invoice PDF
            console.log('18. Generating invoice PDF in background');
            let pdfBlob = null;
            let pdfBuffer = null;
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
              console.log('19. Successfully generated PDF of size:', pdfBuffer.length, 'bytes, time:', Date.now() - backgroundStartTime, 'ms');
            } catch (pdfError) {
              console.error('20. Error generating PDF in background:', pdfError);
              // Continue to next steps even if PDF generation fails
            }
            
            if (pdfBuffer) {
              // Save PDF to Supabase storage
              console.log('21. Saving course booking invoice PDF to Supabase storage');
              try {
                const { error: storageError } = await supabase
                  .storage
                  .from('invoices')
                  .upload(`${invoiceNumber}.pdf`, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true
                  });
                  
                if (storageError) {
                  console.error('22. Error saving PDF to storage:', storageError);
                } else {
                  console.log('23. Successfully saved PDF to storage, time:', Date.now() - backgroundStartTime, 'ms');
                }
              } catch (storageError) {
                console.error('24. Failed to save PDF to storage:', storageError);
                // Continue to next steps even if storage fails
              }
              
              // Send invoice email
              console.log('25. Sending course invoice email in background');
              try {
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
                  pdfBuffer
                });
                
                console.log('26. Email result:', JSON.stringify(emailResult), 'time:', Date.now() - backgroundStartTime, 'ms');
              } catch (emailError) {
                console.error('27. Error sending email in background:', emailError);
                // Continue even if email fails
              }
            }
            
            console.log('28. Background processing completed, total time:', Date.now() - backgroundStartTime, 'ms');
          } catch (backgroundError) {
            console.error('Background processing error:', backgroundError);
          }
        })();
        
        // Return the success response to the client
        return NextResponse.json(responseData);
      } catch (error) {
        console.error('Course invoice creation failed:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to create course invoice' },
          { status: 500 }
        );
      }
    }
    
    // Only reached if none of the product_type conditions are met
    return NextResponse.json(
      { success: false, error: 'Invalid product type' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Unexpected error in invoice creation:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 