import { createServerSupabaseClient } from '@/utils/supabase';
import { logDebug, logError, logInfo, logWarning } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';
import { PRODUCT_TYPES } from '@/constants/statusCodes';

// Resultattyp för processNextJob
export interface JobProcessingResult {
  success: boolean;
  jobId?: string;
  jobType?: string;
  message?: string;
  error?: string;
}

/**
 * Processar nästa väntande jobb i kön
 * Denna funktion kan anropas direkt av bakgrundsprocessor eller via API
 */
export async function processNextJob(requestId: string = uuidv4()): Promise<JobProcessingResult> {
  const supabase = createServerSupabaseClient();
  
  try {
    // Hämta det äldsta väntande jobbet
    logInfo(`Looking for pending jobs`, { requestId });
    
    const { data: job, error: fetchError } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
      
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Inga jobb hittades
        logInfo(`No pending jobs found`, { requestId });
        return { success: true, message: "No pending jobs" };
      }
      
      throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    }
    
    if (!job) {
      logInfo(`No pending jobs found`, { requestId });
      return { success: true, message: "No pending jobs" };
    }
    
    logInfo(`Processing job ${job.id} of type ${job.job_type}`, { 
      requestId, 
      jobId: job.id,
      jobType: job.job_type,
      createdAt: job.created_at
    });
    
    // Uppdatera jobb till 'processing'
    logDebug(`Updating job status to 'processing'`, { 
      requestId,
      jobId: job.id
    });
    
    const { error: updateError } = await supabase
      .from('background_jobs')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString() 
      })
      .eq('id', job.id);
      
    if (updateError) {
      logError(`Failed to update job status`, {
        requestId, 
        jobId: job.id,
        error: updateError.message,
        details: updateError
      });
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }
    
    // Bearbeta baserat på jobbtyp
    try {
      logInfo(`Starting job processing by type: ${job.job_type}`, {
        requestId,
        jobId: job.id
      });
      
      switch(job.job_type) {
        case 'invoice_email':
          await processInvoiceEmailJob(job.job_data);
          break;
          
        case 'order_confirmation':
          // Temporär implementation tills den riktiga är implementerad
          logInfo(`Processing order_confirmation job`, {
            requestId,
            jobId: job.id,
            orderReference: job.job_data.orderReference || 'unknown'
          });
          // TODO: Implementera riktig orderbekräftelse
          break;
          
        case 'gift_card_delivery':
          // Temporär implementation tills den riktiga är implementerad
          logInfo(`Processing gift_card_delivery job`, {
            requestId,
            jobId: job.id,
            giftCardCode: job.job_data.giftCardCode || 'unknown'
          });
          // TODO: Implementera riktig presentkortslevererans
          break;
          
        default:
          throw new Error(`Unknown job type: ${job.job_type}. Allowed types are: invoice_email, order_confirmation, gift_card_delivery`);
      }
      
      // Markera jobb som slutfört
      logInfo(`Job completed successfully, updating status`, {
        requestId,
        jobId: job.id
      });
      
      await supabase
        .from('background_jobs')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString(),
          result: { success: true }
        })
        .eq('id', job.id);
      
      logInfo(`Job ${job.id} completed successfully`, { requestId, jobId: job.id });
      
      return {
        success: true,
        jobId: job.id,
        jobType: job.job_type,
        message: "Job processed successfully"
      };
      
    } catch (processingError) {
      logError(`Error processing job ${job.id}`, { 
        requestId,
        jobId: job.id,
        error: processingError instanceof Error ? processingError.message : 'Unknown error',
        stack: processingError instanceof Error ? processingError.stack : undefined
      });
      
      // Markera jobb som misslyckat
      await supabase
        .from('background_jobs')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString(),
          result: { 
            success: false, 
            error: processingError instanceof Error ? processingError.message : 'Unknown error' 
          }
        })
        .eq('id', job.id);
      
      return {
        success: false,
        jobId: job.id,
        error: processingError instanceof Error ? processingError.message : 'Unknown error'
      };
    }
    
  } catch (error) {
    logError(`Critical error in job processor`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Bearbetar ett invoice email-jobb
 */
async function processInvoiceEmailJob(jobData: any): Promise<void> {
  const requestId = uuidv4(); // Generate a request ID for tracking this job execution
  logInfo(`Starting invoice email job processing`, {
    requestId,
    paymentReference: jobData.paymentReference,
    invoiceNumber: jobData.invoiceNumber,
    productType: jobData.productType
  });

  try {
    // Dynamically import required modules
    logDebug(`Importing required modules`, { requestId });
    const { sendServerInvoiceEmail } = await import('@/utils/serverEmail');
    const { generateAndStoreInvoicePdf, generateAndStoreGiftCardPdf } = await import('@/utils/pdfGenerator');
    const supabase = createServerSupabaseClient();
    
    // Extract job data
    const {
      paymentReference,
      invoiceNumber,
      productType,
      productId,
      userInfo,
      invoiceDetails,
      amount,
      giftCardDetails
    } = jobData;
    
    // Validera och logga nyckeldata för felsökning
    if (!paymentReference) {
      logError(`KRITISKT: Saknar payment_reference i jobbdata`, { 
        requestId,
        jobDataKeys: Object.keys(jobData) 
      });
      throw new Error('Missing payment_reference in job data');
    }
    
    // Validera att vi har all nödvändig data
    if (!paymentReference || !invoiceNumber || !productType || !productId || !userInfo || !amount) {
      logError(`Missing required job data`, {
        requestId,
        paymentReference,
        invoiceNumber,
        hasUserInfo: !!userInfo,
        hasInvoiceDetails: !!invoiceDetails
      });
      throw new Error('Missing required job data');
    }
    
    logDebug(`Fetching product details for ${productType}`, {
      requestId,
      productId,
      productType
    });
    
    // Fetch product details
    let productDetails: any = null;
    
    if (productType === PRODUCT_TYPES.COURSE) {
      // Hämta kursinstans och kursmall för att få tillgång till all nödvändig data
      const { data: courseInstance, error: courseError } = await supabase
        .from('course_instances')
        .select('id, title, description, start_date, price, template_id')
        .eq('id', productId)
        .single();
        
      if (courseError) {
        logError(`Failed to fetch course details`, {
          requestId,
          productId,
          error: courseError.message
        });
        throw new Error(`Could not fetch course details: ${courseError.message}`);
      }
      
      let templateData = null;
      
      // Om vi har en template_id, hämta detaljer om kursmallen för att få location
      if (courseInstance.template_id) {
        const { data: template, error: templateError } = await supabase
          .from('course_templates')
          .select('id, location, rich_description')
          .eq('id', courseInstance.template_id)
          .single();
          
        if (!templateError && template) {
          templateData = template;
          
          logDebug(`Retrieved course template data`, {
            requestId,
            templateId: template.id,
            hasLocation: !!template.location
          });
        } else {
          logWarning(`Could not fetch course template, continuing with default values`, {
            requestId,
            templateId: courseInstance.template_id,
            error: templateError?.message
          });
        }
      }
      
      logDebug(`Retrieved course details`, {
        requestId,
        courseTitle: courseInstance.title,
        courseDate: courseInstance.start_date,
        hasTemplateData: !!templateData
      });
      
      // Normalisera kursdata för PDF/Email-generering - kombinera data från instans och mall
      productDetails = {
        ...courseInstance,
        // Använd data från mall om den finns, annars standardvärden
        location: templateData?.location || 'Studio Clay, Norrtullsgatan 65',
        rich_description: templateData?.rich_description || null,
        name: courseInstance.title // Säkerställ att name-fältet finns
      };
    } else if (productType === PRODUCT_TYPES.ART_PRODUCT) {
      // För konstprodukter, behöver vi först kolla i products-tabellen
      logDebug(`Fetching art product details from products table`, {
        requestId,
        productId
      });
      
      try {
        // Hämta produktdata från products-tabellen med korrekta kolumnnamn
        const { data, error } = await supabase
          .from('products')
          .select('id, title, description, price, stock_quantity, in_stock, image')
          .eq('id', productId)
          .single();
          
        if (error) {
          logError(`Failed to fetch product details`, {
            requestId,
            productId,
            error: error.message
          });
          throw new Error(`Could not fetch product details: ${error.message}`);
        }
        
        // Hämta även art_orders-information om det finns
        const { data: artOrderData, error: artOrderError } = await supabase
          .from('art_orders')
          .select('*')
          .eq('product_id', productId)
          .eq('payment_reference', paymentReference)
          .maybeSingle();
          
        if (artOrderError && artOrderError.code !== 'PGRST116') { // PGRST116 = No rows found
          logWarning(`Problem fetching art order data, continuing with product data only`, {
            requestId,
            productId,
            error: artOrderError.message
          });
        }
        
        logDebug(`Retrieved art product details`, {
          requestId,
          productTitle: data.title,
          hasArtOrderData: !!artOrderData
        });
        
        // Kombinera produkt- och orderdata och normalisera för PDF/Email-generering
        productDetails = {
          ...data,
          name: data.title,
          start_date: new Date().toISOString(),
          location: 'Studio Clay, Stockholm',
          stock: data.stock_quantity,
          order_data: artOrderData || null
        };
      } catch (error) {
        logError(`Error fetching art product details`, {
          requestId,
          productId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Skapa standardvärden om vi inte kunde hämta data
        productDetails = {
          id: productId,
          title: 'Konstprodukt',
          name: 'Konstprodukt',
          description: 'Konstprodukt från Studio Clay',
          price: amount,
          start_date: new Date().toISOString(),
          location: 'Studio Clay, Stockholm'
        };
      }
    } else if (productType === PRODUCT_TYPES.GIFT_CARD) {
      // För presentkort, skapa ett enkelt productDetails-objekt
      logDebug(`Creating gift card product details`, {
        requestId,
        productId,
        amount
      });
      
      productDetails = {
        id: productId,
        title: 'Presentkort Studio Clay',
        name: 'Presentkort Studio Clay',
        description: 'Presentkort för användning i Studio Clay',
        price: amount,
        start_date: new Date().toISOString(),
        location: 'Studio Clay, Stockholm'
      };
    } else {
      // Om produkttypen är okänd eller inte stöds ännu
      logWarning(`Unknown or unsupported product type: ${productType}`, {
        requestId,
        productId
      });
      
      // Använd en generisk produkt för att ändå kunna slutföra processen
      productDetails = {
        id: productId,
        title: 'Produkt',
        name: 'Produkt',
        description: 'Produkt från Studio Clay',
        price: amount,
        start_date: new Date().toISOString(),
        location: 'Studio Clay, Stockholm'
      };
    }
    
    // Generate PDF
    const dueDate = new Date(new Date().setDate(new Date().getDate() + 10)).toLocaleDateString('sv-SE');
    
    const invoiceData = {
      customerInfo: userInfo,
      courseDetails: productDetails,
      invoiceDetails: invoiceDetails,
      invoiceNumber: invoiceNumber,
      dueDate: dueDate
    };
    
    logInfo(`Generating invoice PDF for job`, { 
      requestId,
      invoiceNumber, 
      paymentReference,
      userEmail: userInfo.email
    });
    
    try {
      // Använd centraliserad PDF-generering och lagring
      logDebug(`Using centralized PDF generation and storage`, { 
        requestId,
        invoiceNumber,
        productType,
        productDetails: {
          title: productDetails.title,
          id: productDetails.id,
          price: productDetails.price
        }
      });
      
      // Först försöker vi generera PDF och spara den i lagringen
      let pdfResult;
      try {
        // Skapa ett komplett objekt för PDF-generering
        const pdfOptions = {
          requestId,
          userInfo,
          invoiceDetails,
          invoiceNumber,
          productType,
          productId,
          amount,
          productDetails,
          paymentReference,
          storeToBucket: true // Explicit ange att vi vill lagra PDFen
        };
        
        logDebug(`Calling generateAndStoreInvoicePdf with options`, { 
          requestId,
          options: {
            invoiceNumber,
            productType,
            userEmail: userInfo.email
          }
        });
        
        pdfResult = await generateAndStoreInvoicePdf(pdfOptions);
        
        if (!pdfResult.success) {
          // Om PDF-generering misslyckas med lagring, försök utan lagring
          logWarning(`PDF generation with storage failed, trying without storage`, {
            requestId,
            invoiceNumber,
            error: pdfResult.error
          });
          
          pdfOptions.storeToBucket = false;
          pdfResult = await generateAndStoreInvoicePdf(pdfOptions);
          
          if (!pdfResult.success) {
            throw new Error(pdfResult.error || 'PDF generation failed completely');
          }
          
          logInfo(`Successfully generated PDF without storage`, {
            requestId,
            invoiceNumber,
            pdfBlob: !!pdfResult.pdfBlob
          });
        } else {
          logInfo(`Successfully stored PDF in Supabase bucket`, {
            requestId,
            invoiceNumber,
            storagePath: pdfResult.storagePath,
            publicUrl: pdfResult.publicUrl
          });
        }
      } catch (pdfGenerationError) {
        // Logga felet ordentligt och låt det bubbla uppåt
        logError(`PDF generation failed completely`, {
          requestId,
          invoiceNumber,
          error: pdfGenerationError instanceof Error ? pdfGenerationError.message : 'Unknown error',
          stack: pdfGenerationError instanceof Error ? pdfGenerationError.stack : undefined
        });
        throw pdfGenerationError;
      }
      
      // Now, if this is a gift card, we need to also generate a gift card PDF
      let giftCardPdfResult = null;
      
      if (productType === PRODUCT_TYPES.GIFT_CARD) {
        logInfo(`This is a gift card purchase, generating gift card PDF`, {
          requestId,
          paymentReference,
          hasGiftCardDetails: !!giftCardDetails
        });
        
        try {
          // Först logga hur många presentkort som finns med denna referens
          const { count: giftCardCount, error: countError } = await supabase
            .from('gift_cards')
            .select('*', { count: 'exact', head: true })
            .eq('payment_reference', paymentReference);
            
          if (countError) {
            logWarning(`Could not count gift cards with this payment reference`, {
              requestId,
              paymentReference,
              error: countError.message
            });
          } else {
            const count = giftCardCount || 0;
            logInfo(`Found ${count} gift cards with payment reference ${paymentReference}`, {
              requestId,
              count
            });
            
            if (count === 0) {
              logWarning(`No gift cards found with payment_reference=${paymentReference}`, {
                requestId,
                paymentReference,
                giftCardCodeFromDetails: giftCardDetails?.code
              });
            } else if (count > 1) {
              logWarning(`Multiple gift cards (${count}) found with same payment reference!`, {
                requestId,
                paymentReference
              });
            }
          }
          
          // Sökning i flera steg för att vara extremt robust:
          let giftCardData = null;
          let fetchError = null;
          
          // Steg 1: Sök på payment_reference (exakt match)
          if (!giftCardData) {
            const result = await supabase
              .from('gift_cards')
              .select('*')
              .eq('payment_reference', paymentReference)
              .maybeSingle();
              
            if (result.data) {
              giftCardData = result.data;
              logInfo(`Found gift card using exact payment_reference match`, {
                requestId,
                giftCardId: giftCardData.id,
                code: giftCardData.code
              });
            } else {
              fetchError = result.error;
            }
          }
          
          // Steg 2: Om ingen hittades, sök på code från giftCardDetails
          if (!giftCardData && giftCardDetails?.code) {
            const result = await supabase
              .from('gift_cards')
              .select('*')
              .eq('code', giftCardDetails.code)
              .maybeSingle();
              
            if (result.data) {
              giftCardData = result.data;
              logInfo(`Found gift card using code match`, {
                requestId,
                giftCardId: giftCardData.id,
                code: giftCardData.code,
                originalPaymentRef: paymentReference,
                foundPaymentRef: giftCardData.payment_reference
              });
            }
          }
          
          // Steg 3: Sista försök - sök på invoice_number
          if (!giftCardData && jobData.invoiceNumber) {
            const result = await supabase
              .from('gift_cards')
              .select('*')
              .eq('invoice_number', jobData.invoiceNumber)
              .maybeSingle();
              
            if (result.data) {
              giftCardData = result.data;
              logInfo(`Found gift card using invoice_number match`, {
                requestId,
                giftCardId: giftCardData.id,
                invoiceNumber: jobData.invoiceNumber
              });
            }
          }
          
          // Slutlig kontroll - hittades något presentkort?
          if (!giftCardData) {
            logError(`No gift card found after multiple search attempts`, {
              requestId,
              paymentReference,
              giftCardCode: giftCardDetails?.code,
              invoiceNumber: jobData.invoiceNumber
            });
            // Fortsätt utan presentkorts-PDF om inget hittas
          } else {
            logInfo(`🎁 Retrieved gift card data for PDF generation`, {
              requestId,
              giftCardId: giftCardData.id,
              code: giftCardData.code,
              amount: giftCardData.amount,
              paymentReference: giftCardData.payment_reference,
              recipientName: giftCardData.recipient_name
            });
            
            // Prepare a proper gift card data object
            const completeGiftCardData = {
              amount: giftCardData.amount,
              code: giftCardData.code,
              payment_reference: giftCardData.payment_reference,
              recipientName: giftCardData.recipient_name,
              recipientEmail: giftCardData.recipient_email,
              senderName: giftCardData.sender_name,
              message: giftCardData.message,
              createdAt: new Date(giftCardData.created_at),
              expiresAt: new Date(giftCardData.expires_at)
            };
            
            // Generate gift card PDF
            logInfo(`Generating gift card PDF`, {
              requestId,
              paymentReference,
              code: completeGiftCardData.code,
              usesPaymentReference: !!completeGiftCardData.payment_reference
            });
            
            giftCardPdfResult = await generateAndStoreGiftCardPdf({
              requestId,
              giftCardData: completeGiftCardData,
              paymentReference,
              storeToBucket: true
            });
            
            if (!giftCardPdfResult.success) {
              logError(`Failed to generate gift card PDF`, {
                requestId,
                error: giftCardPdfResult.error,
                paymentReference
              });
              // Continue without gift card PDF if generation fails
            } else {
              logInfo(`Successfully generated gift card PDF`, {
                requestId,
                storagePath: giftCardPdfResult.storagePath,
                publicUrl: giftCardPdfResult.publicUrl
              });
              
              // Update gift card record with PDF URL if it was successfully generated
              const { error: updateError } = await supabase
                .from('gift_cards')
                .update({
                  pdf_url: giftCardPdfResult.publicUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('payment_reference', paymentReference);
                
              if (updateError) {
                logWarning(`Failed to update gift card with PDF URL`, {
                  requestId,
                  paymentReference,
                  error: updateError.message
                });
              } else {
                logInfo(`Updated gift card record with PDF URL`, {
                  requestId,
                  paymentReference
                });
              }
            }
          }
        } catch (giftCardError) {
          logError(`Exception during gift card PDF generation`, {
            requestId,
            error: giftCardError instanceof Error ? giftCardError.message : 'Unknown error',
            stack: giftCardError instanceof Error ? giftCardError.stack : undefined
          });
          // Continue without gift card PDF if generation fails
        }
      }
      
      // Nu när vi har en PDF, skicka e-post
      if (!pdfResult.pdfBlob) {
        throw new Error('PDF generation succeeded but no PDF blob available');
      }
      
      // Convert blob to buffer for server-side email
      const arrayBuffer = await pdfResult.pdfBlob.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      
      // Convert gift card PDF blob to buffer if available
      let giftCardPdfBuffer: Buffer | undefined = undefined;
      if (giftCardPdfResult && giftCardPdfResult.success && giftCardPdfResult.pdfBlob) {
        const giftCardArrayBuffer = await giftCardPdfResult.pdfBlob.arrayBuffer();
        giftCardPdfBuffer = Buffer.from(giftCardArrayBuffer);
        logInfo(`Gift card PDF prepared for email attachment`, {
          requestId,
          bufferSize: giftCardPdfBuffer.length
        });
      }
      
      // Send email with PDF
      logInfo(`Sending invoice email for job`, { 
        requestId,
        email: userInfo.email,
        invoiceNumber,
        hasAttachment: !!pdfBuffer,
        attachmentSizeBytes: pdfBuffer.length,
        hasGiftCardPdfBuffer: !!giftCardPdfBuffer,
        isGiftCard: productType === PRODUCT_TYPES.GIFT_CARD
      });
      
      let emailResult;
      
      // In development, we can bypass email sending to test the job processor
      if (process.env.NODE_ENV === 'development' && process.env.BYPASS_EMAIL_IN_JOBS === 'true') {
        logInfo(`Development mode: Bypassing actual email sending`, { requestId });
        emailResult = { 
          success: true, 
          message: 'Email sending bypassed in development mode'
        };
      } else {
        // Real email sending - import module explicitly
        logDebug(`Importing email module for sending invoice email`, { requestId });
        const { sendServerInvoiceEmail } = await import('@/utils/serverEmail');
        
        if (!sendServerInvoiceEmail) {
          logError(`Failed to import email module - function is undefined`, { requestId });
          throw new Error('Email module import failed');
        }
        
        logDebug(`Calling sendServerInvoiceEmail with parameters`, { 
          requestId,
          productType,
          isGiftCard: productType === PRODUCT_TYPES.GIFT_CARD,
          isProduct: productType === PRODUCT_TYPES.ART_PRODUCT,
          hasGiftCardPdf: !!giftCardPdfBuffer
        });
          
        // Retrieve gift card code if this is a gift card purchase
        let giftCardCode = null;
        if (productType === PRODUCT_TYPES.GIFT_CARD) {
          const { data: giftCard } = await supabase
            .from('gift_cards')
            .select('code')
            .eq('payment_reference', paymentReference)
            .single();
            
          if (giftCard) {
            giftCardCode = giftCard.code;
            logInfo(`Retrieved gift card code for email: ${giftCardCode}`, { requestId });
          } else {
            logWarning(`Could not retrieve gift card code for email`, { 
              requestId,
              paymentReference
            });
          }
        }
        
        // Real email sending
        emailResult = await sendServerInvoiceEmail({
          userInfo: userInfo,
          paymentDetails: {
            amount: amount,
            method: 'invoice',
            paymentReference: paymentReference,
            invoiceNumber: invoiceNumber
          },
          courseDetails: productDetails,
          invoiceNumber: invoiceNumber,
          pdfBuffer: pdfBuffer,
          isGiftCard: productType === PRODUCT_TYPES.GIFT_CARD,
          giftCardCode: giftCardCode,
          giftCardPdfBuffer: giftCardPdfBuffer,
          isProduct: productType === PRODUCT_TYPES.ART_PRODUCT
        });
      }
      
      if (!emailResult.success) {
        logError(`Failed to send invoice email`, {
          requestId,
          error: emailResult.message,
          invoiceNumber
        });
        throw new Error(`Failed to send invoice email: ${emailResult.message}`);
      }
      
      logInfo(`Successfully sent invoice email`, {
        requestId,
        email: userInfo.email,
        invoiceNumber,
        withGiftCardPdf: !!giftCardPdfBuffer
      });
      
      // Update payment record to mark email as sent
      logDebug(`Updating payment record to mark email as sent`, {
        requestId,
        paymentReference
      });
      
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('payment_reference', paymentReference);
        
      if (updateError) {
        logWarning(`Failed to update payment record with email status`, {
          requestId,
          paymentReference,
          error: updateError.message
        });
      } else {
        logInfo(`Successfully marked payment as email sent`, {
          requestId,
          paymentReference
        });
      }
    } catch (pdfError) {
      logError(`Error in PDF generation or email sending`, {
        requestId,
        error: pdfError instanceof Error ? pdfError.message : 'Unknown error',
        stack: pdfError instanceof Error ? pdfError.stack : undefined,
        invoiceNumber
      });
      throw pdfError;
    }
  } catch (error) {
    logError(`Failed to process invoice email job`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      paymentReference: jobData.paymentReference
    });
    throw error;
  }
} 