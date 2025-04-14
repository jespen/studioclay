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
    const { generateAndStoreInvoicePdf } = await import('@/utils/pdfGenerator');
    const supabase = createServerSupabaseClient();
    
    // Extract job data
    const {
      paymentReference,
      invoiceNumber,
      productType,
      productId,
      userInfo,
      invoiceDetails,
      amount
    } = jobData;
    
    // Validate required job data
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
          paymentReference
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
          throw new Error(pdfResult.error || 'PDF generation failed without specific error');
        }
        
        logInfo(`Successfully stored PDF in Supabase bucket`, {
          requestId,
          invoiceNumber,
          storagePath: pdfResult.storagePath,
          publicUrl: pdfResult.publicUrl
        });
      } catch (pdfGenerationError) {
        // Om centraliserad PDF-generering misslyckas, logga detaljerat fel
        logError(`PDF generation and storage failed, falling back to direct generation`, {
          requestId,
          invoiceNumber,
          error: pdfGenerationError instanceof Error ? pdfGenerationError.message : 'Unknown error',
          stack: pdfGenerationError instanceof Error ? pdfGenerationError.stack : undefined
        });
        
        // Fallback: Generera PDF direkt utan att spara i bucket
        logDebug(`Importing direct PDF generation module as fallback`, { requestId });
        const { generateInvoicePDF } = await import('@/utils/invoicePDF');
        
        if (!generateInvoicePDF) {
          throw new Error('Cannot import PDF generation module');
        }
        
        logDebug(`Attempting direct PDF generation`, { requestId });
        const pdfBlob = await generateInvoicePDF(invoiceData);
        
        if (!pdfBlob) {
          throw new Error('Direct PDF generation failed - returned null or undefined');
        }
        
        logInfo(`Successfully generated PDF directly (without storage)`, {
          requestId,
          invoiceNumber,
          pdfSizeBytes: pdfBlob.size
        });
        
        // Skapa ett resultatobjekt som liknar det från generateAndStoreInvoicePdf
        pdfResult = {
          success: true,
          pdfBlob: pdfBlob,
          storagePath: null,
          publicUrl: null
        };
      }
      
      // Nu när vi har en PDF, skicka e-post
      if (!pdfResult.pdfBlob) {
        throw new Error('PDF generation succeeded but no PDF blob available');
      }
      
      // Convert blob to buffer for server-side email
      const arrayBuffer = await pdfResult.pdfBlob.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      
      // Send email with PDF
      logInfo(`Sending invoice email for job`, { 
        requestId,
        email: userInfo.email,
        invoiceNumber,
        hasAttachment: !!pdfBuffer,
        attachmentSizeBytes: pdfBuffer.length
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
          isProduct: productType === PRODUCT_TYPES.ART_PRODUCT
        });
          
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
        invoiceNumber
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