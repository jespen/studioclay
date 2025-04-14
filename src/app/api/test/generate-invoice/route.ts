import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import { logDebug, logError, logInfo } from '@/lib/logging';
import { generateAndStoreInvoicePdf } from '@/utils/pdfGenerator';
import { sendEmailWithInvoice } from '@/utils/serverEmail';

/**
 * Test endpoint for directly generating an invoice PDF and sending it via email.
 * This bypasses the job queue for direct debugging.
 */
export async function GET(req: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  const requestId = uuidv4();
  const url = new URL(req.url);
  const paymentRef = url.searchParams.get('ref');
  
  // Validate payment reference
  if (!paymentRef) {
    return NextResponse.json(
      { error: 'Payment reference is required. Use ?ref=YOUR_PAYMENT_REF' },
      { status: 400 }
    );
  }

  logInfo(`Direct invoice generation test triggered`, { 
    requestId,
    paymentReference: paymentRef 
  });
  
  try {
    const supabase = createServerSupabaseClient();
    
    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, user_info, metadata')
      .eq('payment_reference', paymentRef)
      .single();
      
    if (paymentError || !payment) {
      logError(`Payment record not found`, { 
        requestId, 
        paymentReference: paymentRef,
        error: paymentError?.message
      });
      
      return NextResponse.json(
        { error: 'Payment record not found', details: paymentError?.message },
        { status: 404 }
      );
    }
    
    // Get any additional data based on product type
    const productType = payment.product_type;
    const productId = payment.product_id;
    
    let productDetails = null;
    
    // Get necessary product details
    if (productType === 'course') {
      const { data, error } = await supabase
        .from('course_instances')
        .select('id, title, description, start_date, location, price')
        .eq('id', productId)
        .single();
        
      if (error) {
        logError(`Failed to get course details`, {
          requestId,
          error: error.message
        });
      } else {
        productDetails = data;
      }
    } else if (productType === 'art_product') {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price')
        .eq('id', productId)
        .single();
        
      if (error) {
        logError(`Failed to get product details`, {
          requestId,
          error: error.message
        });
      } else {
        productDetails = {
          ...data,
          title: data.name,
          start_date: new Date().toISOString(),
          location: 'Studio Clay, Stockholm'
        };
      }
    } else {
      productDetails = {
        id: productId,
        title: 'Presentkort',
        description: 'Presentkort för Studio Clay',
        price: payment.amount,
        start_date: new Date().toISOString(),
        location: 'Studio Clay, Stockholm'
      };
    }
    
    // Extract user info and invoice details
    const userInfo = payment.user_info || {};
    const metadata = payment.metadata || {};
    const invoiceDetails = {
      address: userInfo.address || '',
      postalCode: userInfo.postal_code || userInfo.postalCode || '',
      city: userInfo.city || '',
      reference: userInfo.reference || ''
    };
    
    // Generate invoice number if not present
    const invoiceNumber = payment.invoice_number || `INV-${Date.now().toString().slice(-6)}`;
    
    // 1. Generate PDF
    logInfo(`Starting direct PDF generation for testing`, { 
      requestId, 
      productType, 
      invoiceNumber 
    });
    
    const pdfResult = await generateAndStoreInvoicePdf({
      requestId,
      paymentReference: paymentRef,
      userInfo,
      invoiceDetails,
      invoiceNumber,
      productType,
      productId,
      amount: payment.amount,
      productDetails
    });
    
    if (!pdfResult.success) {
      return NextResponse.json({
        success: false,
        stage: 'pdf_generation',
        error: pdfResult.error
      }, { status: 500 });
    }
    
    logInfo(`PDF generation successful`, { requestId, storagePath: pdfResult.storagePath });
    
    // 2. Send email
    logInfo(`Attempting to send email`, { requestId, recipient: userInfo.email });
    
    const emailResult = await sendEmailWithInvoice({
      userInfo,
      invoiceNumber,
      paymentReference: paymentRef,
      productType,
      pdfBlob: pdfResult.pdfBlob,
      courseDetails: productDetails
    });
    
    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        stage: 'email_sending',
        pdfGenerated: true,
        pdfUrl: pdfResult.publicUrl,
        error: emailResult.message
      }, { status: 500 });
    }
    
    // 3. Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);
      
    if (updateError) {
      logError(`Failed to update payment record`, {
        requestId,
        error: updateError.message
      });
    }
    
    // Return success with all details
    return NextResponse.json({
      success: true,
      message: 'Successfully generated invoice PDF and sent email',
      pdfUrl: pdfResult.publicUrl,
      invoiceNumber,
      emailSent: true,
      emailRecipient: userInfo.email
    });
    
  } catch (error) {
    logError(`Error in direct invoice generation test`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 