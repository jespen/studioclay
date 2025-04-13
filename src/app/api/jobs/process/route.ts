import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logDebug, logError, logInfo, logWarning } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';
import { InvoicePaymentRequest } from '@/types/paymentTypes';
import { PRODUCT_TYPES } from '@/constants/statusCodes';

/**
 * Process background jobs - called by a scheduled job or webhook
 */
export const GET = async (req: NextRequest) => {
  const requestId = uuidv4();
  const supabase = createServerSupabaseClient();
  
  try {
    // Check for a security token
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const secretToken = process.env.JOB_PROCESSOR_TOKEN;
    
    // Validate token if configured
    if (secretToken && token !== secretToken) {
      logWarning(`Unauthorized job processor access attempt`, { requestId });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get the oldest pending job
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
        // No jobs found
        return NextResponse.json({ message: "No pending jobs" });
      }
      
      throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    }
    
    if (!job) {
      return NextResponse.json({ message: "No pending jobs" });
    }
    
    logInfo(`Processing job ${job.id} of type ${job.job_type}`, { 
      requestId, 
      jobId: job.id 
    });
    
    // Update job to 'processing'
    const { error: updateError } = await supabase
      .from('background_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString() 
      })
      .eq('id', job.id);
      
    if (updateError) {
      throw new Error(`Failed to update job status: ${updateError.message}`);
    }
    
    // Process based on job type
    try {
      switch(job.job_type) {
        case 'invoice_email':
          await processInvoiceEmailJob(job.job_data);
          break;
          
        // Add other job types here
          
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }
      
      // Mark job as completed
      await supabase
        .from('background_jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: { success: true }
        })
        .eq('id', job.id);
      
      logInfo(`Job ${job.id} completed successfully`, { requestId, jobId: job.id });
      
      return NextResponse.json({
        success: true,
        jobId: job.id,
        jobType: job.job_type,
        message: "Job processed successfully"
      });
      
    } catch (processingError) {
      logError(`Error processing job ${job.id}`, { 
        requestId,
        jobId: job.id,
        error: processingError instanceof Error ? processingError.message : 'Unknown error'
      });
      
      // Mark job as failed
      await supabase
        .from('background_jobs')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          result: { 
            success: false, 
            error: processingError instanceof Error ? processingError.message : 'Unknown error' 
          }
        })
        .eq('id', job.id);
      
      return NextResponse.json(
        { 
          success: false, 
          jobId: job.id,
          error: processingError instanceof Error ? processingError.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    logError(`Error in job processor`, { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

/**
 * Process an invoice email job
 */
async function processInvoiceEmailJob(jobData: any): Promise<void> {
  const { generateInvoicePDF } = await import('@/utils/invoicePDF');
  const { sendServerInvoiceEmail } = await import('@/utils/serverEmail');
  const supabase = createServerSupabaseClient();
  
  const {
    paymentReference,
    invoiceNumber,
    productType,
    productId,
    userInfo,
    invoiceDetails,
    amount
  } = jobData;
  
  // Fetch product details
  let productDetails: any = null;
  
  if (productType === PRODUCT_TYPES.COURSE) {
    const { data, error } = await supabase
      .from('course_instances')
      .select('id, title, description, start_date, location, price')
      .eq('id', productId)
      .single();
      
    if (error) {
      throw new Error(`Could not fetch course details: ${error.message}`);
    }
    
    productDetails = data;
  } else if (productType === PRODUCT_TYPES.ART_PRODUCT) {
    const { data, error } = await supabase
      .from('products')
      .select('id, title, description, price')
      .eq('id', productId)
      .single();
      
    if (error) {
      throw new Error(`Could not fetch product details: ${error.message}`);
    }
    
    productDetails = {
      ...data,
      start_date: new Date().toISOString(), // Use today's date for non-course products
      location: 'Studio Clay, Stockholm' // Default location
    };
  } else {
    // For gift cards, create a simple product detail object
    productDetails = {
      id: productId,
      title: 'Presentkort Studio Clay',
      description: 'Presentkort för användning i Studio Clay',
      price: amount,
      start_date: new Date().toISOString(),
      location: 'Studio Clay, Stockholm'
    };
  }
  
  // Generate PDF
  const invoiceData = {
    customerInfo: userInfo,
    courseDetails: productDetails,
    invoiceDetails: invoiceDetails,
    invoiceNumber: invoiceNumber,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 10)).toLocaleDateString('sv-SE') // 10 days
  };
  
  logInfo(`Generating invoice PDF for job`, { 
    invoiceNumber, 
    paymentReference 
  });
  
  const pdfBlob = await generateInvoicePDF(invoiceData);
  
  // Convert blob to buffer for server-side email
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);
  
  // Send email with PDF
  logInfo(`Sending invoice email for job`, { email: userInfo.email });
  const emailResult = await sendServerInvoiceEmail({
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
  
  if (!emailResult.success) {
    throw new Error(`Failed to send invoice email: ${emailResult.message}`);
  }
  
  // Update payment record to mark email as sent
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
      paymentReference,
      error: updateError.message
    });
  }
} 