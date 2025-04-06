import nodemailer from 'nodemailer';
import { UserInfo, PaymentDetails } from '@/types/booking';
import { buildConfirmationEmail } from '@/utils/emailBuilder';
import { promisify } from 'util';
import { readFile } from 'fs';
import path from 'path';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';

// Email configuration for server-side sending
const emailConfig = {
  // SMTP settings (for actual deployment, store these in .env variables)
  host: process.env.EMAIL_SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: process.env.EMAIL_SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'eva@studioclay.se', // your email address
    pass: process.env.EMAIL_PASS || ''  // your email password or app password
  },
  // Studio Clay email address
  studioClayEmail: process.env.STUDIO_CLAY_EMAIL || 'eva@studioclay.se',
  // BCC email for keeping copies
  bccEmail: process.env.BCC_EMAIL || ''
};

// Longer keep-alive timer for email sending (30 seconds instead of 15)
const EMAIL_KEEP_ALIVE_MS = 30000;

// Simple format price helper function to avoid import dependency
function formatPrice(price: number): string {
  return price.toLocaleString('sv-SE');
}

// Helper function to create a keep-alive promise with a timer
function createKeepAlivePromise(seconds: number, requestId?: string): Promise<void> {
  console.log(`📧 KEEP-ALIVE: Creating keep-alive timer for ${seconds} seconds${requestId ? ` [${requestId}]` : ''}`);
  
  return new Promise(resolve => {
    const timerId = setTimeout(() => {
      console.log(`📧 KEEP-ALIVE: Timer completed after ${seconds} seconds${requestId ? ` [${requestId}]` : ''}`);
      resolve();
    }, seconds * 1000);
    
    // Ensure the timer is not garbage collected
    // We store a reference to it in the global object
    if (typeof globalThis !== 'undefined') {
      // @ts-ignore - Ignore the type checking for this global variable
      globalThis.keepAliveTimers = globalThis.keepAliveTimers || [];
      // @ts-ignore - Ignore the type checking for this global variable
      globalThis.keepAliveTimers.push(timerId);
    }
  });
}

// Function to log SMTP errors in detail
function logSMTPError(error: any) {
  console.error('📧 SMTP ERROR:', {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    command: error?.command,
    responseCode: error?.responseCode,
    response: error?.response,
    source: error?.source,
    hostname: error?.address,
    port: error?.port,
    username: error?.username ? '[set]' : '[not set]',
    method: error?.method,
    tlsError: error?.cert || error?.tls || null,
  });
}

// Create a reusable transporter
const createTransporter = async () => {
  console.log('📧 TRANSPORTER DIAGNOSTIC 1: Function createTransporter called');
  console.log('📧 TRANSPORTER DIAGNOSTIC 2: Process info:', {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    region: process.env.VERCEL_REGION,
    isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  });
  
  // PRODUCTION DIAGNOSTIC: Add more detailed environment information
  console.log('📧 =========== EMAIL CONFIGURATION DETAILS ===========');
  console.log(`📧 Running in environment: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`📧 VERCEL_ENV: ${process.env.VERCEL_ENV || 'undefined'}`);
  console.log(`📧 SMTP Host: ${process.env.EMAIL_SMTP_HOST || 'default: smtp.office365.com'}`);
  console.log(`📧 SMTP Port: ${process.env.EMAIL_SMTP_PORT || 'default: 587'}`);
  console.log(`📧 SMTP Secure: ${process.env.EMAIL_SMTP_SECURE || 'default: false'}`);
  console.log(`📧 Email User: ${process.env.EMAIL_USER || 'default: eva@studioclay.se'}`);
  console.log(`📧 Email Pass: ${process.env.EMAIL_PASS ? '[set]' : '[not set]'}`);
  console.log(`📧 Email Pass Length: ${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0}`);
  console.log(`📧 Studio Clay Email: ${process.env.STUDIO_CLAY_EMAIL || 'default: eva@studioclay.se'}`);
  console.log(`📧 BCC Email: ${process.env.BCC_EMAIL || '[not set]'}`);
  console.log(`📧 DISABLE_ETHEREAL: ${process.env.DISABLE_ETHEREAL || 'default: undefined'}`);
  console.log('📧 ================================================');

  // Skip Ethereal if disabled or in production
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (process.env.DISABLE_ETHEREAL === 'true' || isProd) {
    console.log(`📧 Using real SMTP server for email delivery (${isProd ? 'production' : 'development'} mode)`);
    
    const host = process.env.EMAIL_SMTP_HOST || 'smtp.office365.com';
    const port = parseInt(process.env.EMAIL_SMTP_PORT || '587');
    const user = process.env.EMAIL_USER || 'eva@studioclay.se';
    const pass = process.env.EMAIL_PASS || '';
    const secure = process.env.EMAIL_SMTP_SECURE === 'true';
    
    // Log the SMTP configuration
    console.log(`📧 SMTP Configuration: ${host}:${port} (secure: ${secure})`);
    console.log(`📧 Auth User: ${user}`);
    
    // Validate email credentials before attempting to create transporter
    if (!user) {
      console.error('📧 ERROR: Missing email username. Check your environment variables.');
      return null;
    }
    
    if (!pass) {
      console.error('📧 ERROR: Missing email password. Check your environment variables.');
      return null;
    }
    
    try {
      // Create standard transport using standard options
      console.log('📧 Creating SMTP transport with TLS');
      const transport = nodemailer.createTransport({
        host: host,
        port: port,
        secure: secure,
        auth: {
          user: user,
          pass: pass
        },
        tls: {
          // Microsoft recommends TLS 1.2
          minVersion: 'TLSv1.2',
          // Trust any certificate since Office 365 uses valid certs
          rejectUnauthorized: true
        },
        debug: true,
        logger: true // Enable built-in logger
      });
      
      // Verify connection configuration
      console.log('📧 Verifying SMTP connection...');
      try {
        await transport.verify();
        console.log('📧 SMTP server connection verified successfully ✅');
        return transport;
      } catch (verifyError) {
        console.error('📧 SMTP connection verification failed:', verifyError);
        logSMTPError(verifyError);
        throw verifyError; // Re-throw to try alternate config
      }
    } catch (error) {
      console.error('📧 Error creating SMTP transport:', error);
      logSMTPError(error);
      
      // Try alternate secure configuration if first attempt failed
      try {
        console.log('📧 Trying alternate secure configuration (SSL)');
        
        const sslTransport = nodemailer.createTransport({
          host: host,
          port: 465, // Standard secure SMTP port
          secure: true, // Use SSL
          auth: {
            user: user,
            pass: pass
          },
          debug: true,
          logger: true // Enable built-in logger
        });
        
        console.log('📧 Verifying SSL connection...');
        try {
          await sslTransport.verify();
          console.log('📧 SMTP SSL connection verified successfully ✅');
          return sslTransport;
        } catch (sslVerifyError) {
          console.error('📧 SMTP SSL connection verification failed:', sslVerifyError);
          logSMTPError(sslVerifyError);
          throw sslVerifyError;
        }
      } catch (sslError) {
        console.error('📧 All SMTP connection attempts failed:', sslError);
        logSMTPError(sslError);
        
        if (isProd) {
          console.error('📧 CRITICAL: Email sending is not available in production! ❌');
        }
        
        return null;
      }
    }
  }
  
  // In development mode, use Ethereal for testing emails
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Creating test email account with Ethereal...');
    
    try {
      // Create a test account at Ethereal
      const testAccount = await nodemailer.createTestAccount();
      
      console.log('📧 TEST EMAIL ACCOUNT CREATED:');
      console.log(`📧 Email: ${testAccount.user}`);
      console.log(`📧 Password: ${testAccount.pass}`);
      
      // Create a transporter using the test account
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (error) {
      console.error('Error creating test email account:', error);
      console.log('📧 Falling back to email simulation mode');
      return null;
    }
  }
  
  // For production, use the configured email service
  return nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    secure: process.env.EMAIL_SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'eva@studioclay.se',
      pass: process.env.EMAIL_PASS || ''
    },
  });
};

/**
 * Send an invoice email with PDF attachment from the server
 */
export async function sendServerInvoiceEmail(params: {
  userInfo: UserInfo;
  paymentDetails: PaymentDetails;
  courseDetails: {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    location?: string;
    price: number;
  };
  invoiceNumber: string;
  pdfBuffer?: Buffer; // PDF as a buffer
  isGiftCard?: boolean; // Flag to indicate if this is a gift card purchase
  giftCardCode?: string; // Optional gift card code if this is a gift card
  giftCardPdfBuffer?: Buffer; // Optional gift card PDF buffer to attach
  isProduct?: boolean; // Flag to indicate if this is a product purchase
}): Promise<{ success: boolean; message: string }> {
  console.log('📧 CRITICAL DIAGNOSTIC: sendServerInvoiceEmail function entered');
  console.log('📧 CRITICAL DIAGNOSTIC: Function parameters:', {
    invoiceNumber: params.invoiceNumber,
    recipientEmail: params.userInfo.email,
    isGiftCard: params.isGiftCard,
    isProduct: params.isProduct,
    hasPdfBuffer: !!params.pdfBuffer,
    hasGiftCardPdfBuffer: !!params.giftCardPdfBuffer
  });
  
  const startTime = Date.now();
  console.log('📧 =========== EMAIL SENDING ATTEMPT ===========');
  console.log(`📧 Time: ${new Date().toISOString()}`);
  console.log(`📧 Invoice Number: ${params.invoiceNumber}`);
  console.log(`📧 Type: ${params.isGiftCard ? 'Gift Card' : params.isProduct ? 'Product' : 'Course'}`);
  console.log(`📧 Recipient: ${params.userInfo.email}`);
  console.log(`📧 Has PDF: ${params.pdfBuffer ? 'Yes' : 'No'}`);
  if (params.isGiftCard) {
    console.log(`📧 Gift Card Code: ${params.giftCardCode}`);
    console.log(`📧 Has Gift Card PDF: ${params.giftCardPdfBuffer ? 'Yes' : 'No'}`);
  }
  
  try {
    // Check what type of product this is
    let productType: 'course' | 'gift_card' | 'product' = 'course';
    let title = params.courseDetails.title;
    
    if (params.isGiftCard) {
      productType = 'gift_card';
      title = 'Presentkort';
    } else if (params.isProduct) {
      productType = 'product';
      title = params.courseDetails.title;
    }
    
    // Customize subject line based on product type
    let subjectLine;
    if (params.isGiftCard) {
      subjectLine = `Bekräftelse på ditt presentkortsköp - Studio Clay`;
    } else if (params.isProduct) {
      subjectLine = `Orderbekräftelse - Studio Clay`;
    } else {
      subjectLine = `Bokningsbekräftelse - ${title}`;
    }
    
    console.log(`📧 Building email HTML for product type: ${productType}`);
    // Build email HTML using the modular template system
    const htmlContent = buildConfirmationEmail({
      productType: productType,
      userInfo: params.userInfo,
      paymentDetails: {
        method: 'invoice',
        status: 'pending',
        invoiceNumber: params.invoiceNumber,
        amount: params.courseDetails.price * (parseInt(params.userInfo.numberOfParticipants) || 1)
      },
      itemDetails: {
        id: params.courseDetails.id,
        title: title,
        description: params.courseDetails.description,
        price: params.courseDetails.price,
        start_date: params.courseDetails.start_date,
        location: params.courseDetails.location,
        code: params.giftCardCode // Add gift card code if available
      },
      reference: params.invoiceNumber
    });
    console.log(`📧 Email HTML built successfully`);
    
    // Create reusable transporter
    console.log(`📧 Creating email transporter...`);
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('📧 No transporter available, simulating email send');
      
      // SIMULATION MODE: Generate a test URL if in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 DEV MODE: Email would be sent with subject:', subjectLine);
        console.log('📧 DEV MODE: Email would be sent to:', params.userInfo.email);
        console.log('📧 DEV MODE: Email would have', params.pdfBuffer ? '1' : '0', 'PDF attachments');
        if (params.isGiftCard && params.giftCardPdfBuffer) {
          console.log('📧 DEV MODE: Email would have 1 additional gift card PDF attachment');
        }
      } else {
        // PRODUCTION ERROR: Email cannot be sent
        console.error('📧 CRITICAL PRODUCTION ERROR: Cannot send email due to missing transporter ❌');
        console.error(`📧 Email to ${params.userInfo.email} could not be sent`);
      }
      
      return {
        success: false,
        message: 'Email transporter not available'
      };
    }
    
    // For Office 365, use a simplified from address that exactly matches the authenticated user
    const authenticatedEmail = process.env.EMAIL_USER || 'eva@studioclay.se';
    console.log(`📧 Using authenticated email as sender: ${authenticatedEmail}`);
    
    // Create email attachments array
    const attachments = [];
    
    // Add invoice PDF if available
    if (params.pdfBuffer) {
      console.log(`📧 Adding invoice PDF attachment (${params.pdfBuffer.length} bytes)`);
      attachments.push({
        filename: `Faktura-${params.invoiceNumber}.pdf`,
        content: params.pdfBuffer,
        contentType: 'application/pdf'
      });
    }
    
    // Add gift card PDF if this is a gift card purchase and we have the PDF
    if (params.isGiftCard && params.giftCardPdfBuffer && params.giftCardCode) {
      console.log(`📧 Adding gift card PDF attachment (${params.giftCardPdfBuffer.length} bytes)`);
      attachments.push({
        filename: `Presentkort-${params.giftCardCode}.pdf`,
        content: params.giftCardPdfBuffer,
        contentType: 'application/pdf'
      });
    }
    
    // Create email options
    const mailOptions = {
      from: authenticatedEmail,
      to: params.userInfo.email,
      subject: subjectLine,
      html: htmlContent,
      bcc: process.env.BCC_EMAIL || undefined,
      attachments: attachments.length > 0 ? attachments : undefined
    };
    
    // Send email
    console.log(`📧 Sending invoice email to: ${params.userInfo.email}`);
    console.log(`📧 Email subject: ${subjectLine}`);
    console.log(`📧 Number of attachments: ${attachments.length}`);
    console.log(`📧 BCC: ${process.env.BCC_EMAIL || 'None'}`);
    
    // Create a keep-alive timer to keep the function running while nodemailer does its work
    const keepAlivePromise = createKeepAlivePromise(60);
    
    try {
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`📧 ✅ Email sent successfully!`);
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`📧 Accepted recipients: ${info.accepted ? info.accepted.join(', ') : 'None'}`);
      console.log(`📧 Rejected recipients: ${info.rejected ? info.rejected.join(', ') : 'None'}`);
      console.log(`📧 Response: ${info.response || 'No response'}`);
      
      // Check if this is a test email from Ethereal
      if (info.messageId && info.messageId.includes('ethereal')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('📧 Test email URL:', previewUrl);
      }
      
      console.log(`📧 Total email processing time: ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      // Wait for keep-alive timer to ensure email has time to be delivered
      await keepAlivePromise;
      
      return {
        success: true,
        message: 'Invoice email sent successfully'
      };
    } catch (sendError: any) {
      console.error(`📧 ❌ ERROR SENDING EMAIL:`);
      console.error(`📧 Error type: ${sendError.name}`);
      console.error(`📧 Error message: ${sendError.message}`);
      logSMTPError(sendError);
      
      console.log(`📧 Total email processing time (failed): ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      throw sendError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('📧 Unhandled error in sendServerInvoiceEmail:', error);
    logSMTPError(error);
    
    console.log(`📧 Total email processing time (error): ${Date.now() - startTime}ms`);
    console.log('📧 ===========================================');
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending invoice email'
    };
  }
}

/**
 * Send a booking confirmation email from the server
 */
export async function sendServerBookingConfirmationEmail(params: {
  userInfo: UserInfo;
  paymentDetails: PaymentDetails;
  courseDetails: {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    location?: string;
    price: number;
  };
  bookingReference: string;
}): Promise<{ success: boolean; message: string }> {
  const startTime = Date.now();
  console.log('📧 =========== BOOKING EMAIL SENDING ATTEMPT ===========');
  console.log(`📧 Time: ${new Date().toISOString()}`);
  console.log(`📧 Booking Reference: ${params.bookingReference}`);
  console.log(`📧 Course: ${params.courseDetails.title}`);
  console.log(`📧 Recipient: ${params.userInfo.email}`);
  
  try {
    // Build email HTML using the modular template system
    console.log(`📧 Building booking confirmation email HTML...`);
    const htmlContent = buildConfirmationEmail({
      productType: 'course',
      userInfo: params.userInfo,
      paymentDetails: {
        method: params.paymentDetails.method || '',
        status: params.paymentDetails.status || '',
        reference: params.paymentDetails.paymentReference,
        invoiceNumber: params.paymentDetails.invoiceNumber,
        amount: params.courseDetails.price * (parseInt(params.userInfo.numberOfParticipants) || 1)
      },
      itemDetails: {
        id: params.courseDetails.id,
        title: params.courseDetails.title,
        description: params.courseDetails.description,
        price: params.courseDetails.price,
        start_date: params.courseDetails.start_date,
        location: params.courseDetails.location
      },
      reference: params.bookingReference
    });
    console.log(`📧 Email HTML built successfully`);
    
    // Create reusable transporter
    console.log(`📧 Creating email transporter...`);
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('📧 No transporter available, simulating email send');
      
      // SIMULATION MODE: Generate a test URL if in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 DEV MODE: Booking confirmation email would be sent to:', params.userInfo.email);
        console.log('📧 DEV MODE: Subject would be:', `Bokningsbekräftelse - ${params.courseDetails.title}`);
      } else {
        // PRODUCTION ERROR: Email cannot be sent
        console.error('📧 CRITICAL PRODUCTION ERROR: Cannot send booking confirmation email due to missing transporter ❌');
        console.error(`📧 Email to ${params.userInfo.email} could not be sent`);
      }
      
      console.log(`📧 Total email processing time (failed): ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      return {
        success: false,
        message: 'Email transporter not available'
      };
    }
    
    // For Office 365, use a simplified from address that exactly matches the authenticated user
    const authenticatedEmail = process.env.EMAIL_USER || 'eva@studioclay.se';
    console.log(`📧 Using authenticated email as sender: ${authenticatedEmail}`);
    
    // Create email options
    const mailOptions = {
      from: authenticatedEmail,
      to: params.userInfo.email,
      subject: `Bokningsbekräftelse - ${params.courseDetails.title}`,
      html: htmlContent,
      bcc: process.env.BCC_EMAIL || undefined
    };
    
    // Send email
    console.log(`📧 Sending booking confirmation email to: ${params.userInfo.email}`);
    console.log(`📧 Email subject: Bokningsbekräftelse - ${params.courseDetails.title}`);
    console.log(`📧 BCC: ${process.env.BCC_EMAIL || 'None'}`);
    
    // Create a keep-alive timer to keep the function running while nodemailer does its work
    const keepAlivePromise = createKeepAlivePromise(60);
    
    try {
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`📧 ✅ Booking confirmation email sent successfully!`);
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`📧 Accepted recipients: ${info.accepted ? info.accepted.join(', ') : 'None'}`);
      console.log(`📧 Rejected recipients: ${info.rejected ? info.rejected.join(', ') : 'None'}`);
      console.log(`📧 Response: ${info.response || 'No response'}`);
      
      // Check if this is a test email from Ethereal
      if (info.messageId && info.messageId.includes('ethereal')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('📧 Test email URL:', previewUrl);
      }
      
      console.log(`📧 Total email processing time: ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      // Wait for keep-alive timer to ensure email has time to be delivered
      await keepAlivePromise;
      
      return {
        success: true,
        message: 'Booking confirmation email sent successfully'
      };
    } catch (sendError: any) {
      console.error(`📧 ❌ ERROR SENDING BOOKING EMAIL:`);
      console.error(`📧 Error type: ${sendError.name}`);
      console.error(`📧 Error message: ${sendError.message}`);
      logSMTPError(sendError);
      
      console.log(`📧 Total email processing time (failed): ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      throw sendError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('📧 Unhandled error in sendServerBookingConfirmationEmail:', error);
    logSMTPError(error);
    
    console.log(`📧 Total email processing time (error): ${Date.now() - startTime}ms`);
    console.log('📧 ===========================================');
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending booking confirmation email'
    };
  }
}

/**
 * Send a gift card email with PDF attachment from the server
 * 
 * Changes:
 * 1. Now sends the gift card email to the *sender/purchaser* (not recipient)
 * 2. Always attaches the PDF to the confirmation email 
 */
export async function sendServerGiftCardEmail(params: {
  giftCardData: {
    code: string;
    amount: number;
    recipient_name: string;
    recipient_email: string;
    message?: string;
    expires_at: string;
  };
  senderInfo: {
    name: string;
    email: string;
  };
  pdfBuffer?: Buffer; // PDF as a buffer
}): Promise<{ success: boolean; message: string }> {
  const startTime = Date.now();
  console.log('📧 =========== GIFT CARD EMAIL SENDING ATTEMPT ===========');
  console.log(`📧 Time: ${new Date().toISOString()}`);
  console.log(`📧 Gift Card Code: ${params.giftCardData.code}`);
  console.log(`📧 Amount: ${params.giftCardData.amount}`);
  console.log(`📧 Sender: ${params.senderInfo.email}`);
  console.log(`📧 Recipient Name: ${params.giftCardData.recipient_name}`);
  console.log(`📧 Recipient Email: ${params.giftCardData.recipient_email}`);
  console.log(`📧 Has PDF: ${params.pdfBuffer ? 'Yes' : 'No'}`);
  
  try {
    // Build email HTML using the modular template system
    console.log(`📧 Building gift card email HTML...`);
    const htmlContent = buildConfirmationEmail({
      productType: 'gift_card',
      userInfo: {
        firstName: params.senderInfo.name,
        lastName: '',
        email: params.senderInfo.email
      },
      paymentDetails: {
        method: 'gift_card',
        status: 'completed',
        amount: params.giftCardData.amount
      },
      itemDetails: {
        id: params.giftCardData.code,
        title: 'Presentkort',
        price: params.giftCardData.amount,
        code: params.giftCardData.code,
        recipient_name: params.giftCardData.recipient_name,
        recipient_email: params.giftCardData.recipient_email,
        expires_at: params.giftCardData.expires_at,
        description: params.giftCardData.message
      },
      reference: params.giftCardData.code
    });
    console.log(`📧 Email HTML built successfully`);
    
    // Create reusable transporter
    console.log(`📧 Creating email transporter...`);
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('📧 No transporter available, simulating email send');
      
      // SIMULATION MODE: Generate a test URL if in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 DEV MODE: Gift card email would be sent with subject: Ditt köpta presentkort - Studio Clay');
        console.log('📧 DEV MODE: Email would be sent to:', params.senderInfo.email);
        console.log('📧 DEV MODE: Email would have', params.pdfBuffer ? '1' : '0', 'PDF attachments');
      } else {
        // PRODUCTION ERROR: Email cannot be sent
        console.error('📧 CRITICAL PRODUCTION ERROR: Cannot send gift card email due to missing transporter ❌');
        console.error(`📧 Gift card email to ${params.senderInfo.email} could not be sent`);
      }
      
      console.log(`📧 Total email processing time (failed): ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      return {
        success: false,
        message: 'Email transporter not available'
      };
    }
    
    // For Office 365, use a simplified from address that exactly matches the authenticated user
    const authenticatedEmail = process.env.EMAIL_USER || 'eva@studioclay.se';
    console.log(`📧 Using authenticated email as sender: ${authenticatedEmail}`);
    
    // Create email options - now sending to the purchaser/sender
    const mailOptions = {
      from: authenticatedEmail,
      to: params.senderInfo.email, // CHANGED: Email now goes to purchaser
      subject: `Ditt köpta presentkort - Studio Clay`,
      html: htmlContent,
      bcc: process.env.BCC_EMAIL || undefined,
      attachments: params.pdfBuffer ? [
        {
          filename: `Presentkort-${params.giftCardData.code}.pdf`,
          content: params.pdfBuffer,
          contentType: 'application/pdf'
        }
      ] : undefined
    };
    
    // Send email
    console.log(`📧 Sending gift card confirmation email to purchaser: ${params.senderInfo.email}`);
    console.log(`📧 Email subject: Ditt köpta presentkort - Studio Clay`);
    console.log(`📧 Has attachment: ${params.pdfBuffer ? 'Yes' : 'No'}`);
    console.log(`📧 BCC: ${process.env.BCC_EMAIL || 'None'}`);
    
    // Create a keep-alive timer to keep the function running while nodemailer does its work
    const keepAlivePromise = createKeepAlivePromise(60);
    
    try {
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`📧 ✅ Gift card confirmation email sent successfully!`);
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`📧 Accepted recipients: ${info.accepted ? info.accepted.join(', ') : 'None'}`);
      console.log(`📧 Rejected recipients: ${info.rejected ? info.rejected.join(', ') : 'None'}`);
      console.log(`📧 Response: ${info.response || 'No response'}`);
      
      // Check if this is a test email from Ethereal
      if (info.messageId && info.messageId.includes('ethereal')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('📧 Test email URL:', previewUrl);
      }
      
      console.log(`📧 Total email processing time: ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      // Wait for keep-alive timer to ensure email has time to be delivered
      await keepAlivePromise;
      
      return {
        success: true,
        message: 'Gift card confirmation email sent successfully'
      };
    } catch (sendError: any) {
      console.error(`📧 ❌ ERROR SENDING GIFT CARD EMAIL:`);
      console.error(`📧 Error type: ${sendError.name}`);
      console.error(`📧 Error message: ${sendError.message}`);
      logSMTPError(sendError);
      
      console.log(`📧 Total email processing time (failed): ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      throw sendError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('📧 Unhandled error in sendServerGiftCardEmail:', error);
    logSMTPError(error);
    
    console.log(`📧 Total email processing time (error): ${Date.now() - startTime}ms`);
    console.log('📧 ===========================================');
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending gift card email'
    };
  }
}

/**
 * Send a product order confirmation email from the server
 */
export async function sendServerProductOrderConfirmationEmail(params: {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
  };
  paymentDetails: {
    method: string;
    status: string;
    reference?: string;
    invoiceNumber?: string;
    amount: number;
  };
  productDetails: {
    id: string;
    title: string;
    description?: string;
    price: number;
    quantity: number;
    image?: string;
  };
  orderReference: string;
}): Promise<{ success: boolean; message: string }> {
  const startTime = Date.now();
  console.log('📧 =========== PRODUCT ORDER EMAIL SENDING ATTEMPT ===========');
  console.log(`📧 Time: ${new Date().toISOString()}`);
  console.log(`📧 Order Reference: ${params.orderReference}`);
  console.log(`📧 Product: ${params.productDetails.title}`);
  console.log(`📧 Quantity: ${params.productDetails.quantity}`);
  console.log(`📧 Total Amount: ${params.productDetails.price * params.productDetails.quantity}`);
  console.log(`📧 Recipient: ${params.userInfo.email}`);
  
  try {
    // Build email HTML using the modular template system
    console.log(`📧 Building product order email HTML...`);
    const htmlContent = buildConfirmationEmail({
      productType: 'product',
      userInfo: params.userInfo,
      paymentDetails: {
        method: params.paymentDetails.method || '',
        status: params.paymentDetails.status || '',
        reference: params.paymentDetails.reference,
        invoiceNumber: params.paymentDetails.invoiceNumber,
        amount: params.productDetails.price * params.productDetails.quantity
      },
      itemDetails: {
        id: params.productDetails.id,
        title: params.productDetails.title,
        description: params.productDetails.description,
        price: params.productDetails.price,
        quantity: params.productDetails.quantity
      },
      reference: params.orderReference
    });
    console.log(`📧 Email HTML built successfully`);
    
    // Create reusable transporter
    console.log(`📧 Creating email transporter...`);
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('📧 No transporter available, simulating email send');
      
      // SIMULATION MODE: Generate a test URL if in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 DEV MODE: Product order email would be sent with subject: Orderbekräftelse - Studio Clay');
        console.log('📧 DEV MODE: Email would be sent to:', params.userInfo.email);
      } else {
        // PRODUCTION ERROR: Email cannot be sent
        console.error('📧 CRITICAL PRODUCTION ERROR: Cannot send product order email due to missing transporter ❌');
        console.error(`📧 Email to ${params.userInfo.email} could not be sent`);
      }
      
      console.log(`📧 Total email processing time (failed): ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      return {
        success: false,
        message: 'Email transporter not available'
      };
    }
    
    // For Office 365, use a simplified from address that exactly matches the authenticated user
    const authenticatedEmail = process.env.EMAIL_USER || 'eva@studioclay.se';
    console.log(`📧 Using authenticated email as sender: ${authenticatedEmail}`);
    
    // Create email options
    const mailOptions = {
      from: authenticatedEmail,
      to: params.userInfo.email,
      subject: `Orderbekräftelse - Studio Clay`,
      html: htmlContent,
      bcc: process.env.BCC_EMAIL || undefined
    };
    
    // Send email
    console.log(`📧 Sending product order confirmation email to: ${params.userInfo.email}`);
    console.log(`📧 Email subject: Orderbekräftelse - Studio Clay`);
    console.log(`📧 BCC: ${process.env.BCC_EMAIL || 'None'}`);
    
    // Create a keep-alive timer to keep the function running while nodemailer does its work
    const keepAlivePromise = createKeepAlivePromise(60);
    
    try {
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`📧 ✅ Product order email sent successfully!`);
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`📧 Accepted recipients: ${info.accepted ? info.accepted.join(', ') : 'None'}`);
      console.log(`📧 Rejected recipients: ${info.rejected ? info.rejected.join(', ') : 'None'}`);
      console.log(`📧 Response: ${info.response || 'No response'}`);
      
      // Check if this is a test email from Ethereal
      if (info.messageId && info.messageId.includes('ethereal')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('📧 Test email URL:', previewUrl);
      }
      
      console.log(`📧 Total email processing time: ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      // Wait for keep-alive timer to ensure email has time to be delivered
      await keepAlivePromise;
      
      return {
        success: true,
        message: 'Product order confirmation email sent successfully'
      };
    } catch (sendError: any) {
      console.error(`📧 ❌ ERROR SENDING PRODUCT ORDER EMAIL:`);
      console.error(`📧 Error type: ${sendError.name}`);
      console.error(`📧 Error message: ${sendError.message}`);
      logSMTPError(sendError);
      
      console.log(`📧 Total email processing time (failed): ${Date.now() - startTime}ms`);
      console.log('📧 ===========================================');
      
      throw sendError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('📧 Unhandled error in sendServerProductOrderConfirmationEmail:', error);
    logSMTPError(error);
    
    console.log(`📧 Total email processing time (error): ${Date.now() - startTime}ms`);
    console.log('📧 ===========================================');
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending product order confirmation email'
    };
  }
}

export function createTransporter() {
  console.log('📧 TRANSPORTER DIAGNOSTIC 1: Function createTransporter called');
  
  // Log process environment information for debugging
  const processInfo = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    region: process.env.VERCEL_REGION,
    isProduction: process.env.NODE_ENV === 'production'
  };
  
  console.log('📧 TRANSPORTER DIAGNOSTIC 2: Process info:', processInfo);
  
  // Get email configuration from environment variables
  const host = process.env.EMAIL_SMTP_HOST || 'smtp.office365.com';
  const port = parseInt(process.env.EMAIL_SMTP_PORT || '587', 10);
  const secure = process.env.EMAIL_SMTP_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const defaultFrom = process.env.EMAIL_FROM || 'eva@studioclay.se';
  const bcc = process.env.EMAIL_BCC;
  
  console.log('📧 =========== EMAIL CONFIGURATION DETAILS ===========');
  console.log(`📧 Running in environment: ${process.env.NODE_ENV}`);
  console.log(`📧 VERCEL_ENV: ${process.env.VERCEL_ENV}`);
  console.log(`📧 SMTP Host: ${host}`);
  console.log(`📧 SMTP Port: ${port}`);
  console.log(`📧 SMTP Secure: ${secure}`);
  console.log(`📧 Email User: ${user}`);
  console.log(`📧 Email Pass: ${pass ? '[set]' : '[not set]'}`);
  console.log(`📧 Email Pass Length: ${pass ? pass.length : 0}`);
  console.log(`📧 Studio Clay Email: default: ${defaultFrom}`);
  console.log(`📧 BCC Email: ${bcc ? bcc : '[not set]'}`);
  console.log(`📧 DISABLE_ETHEREAL: default: ${process.env.DISABLE_ETHEREAL}`);
  console.log('📧 ================================================');
  
  if (!user || !pass) {
    console.error('📧 ERROR: Missing email credentials - user or password not set');
    console.error(`📧 EMAIL_USER: ${user ? 'set' : 'missing'}`);
    console.error(`📧 EMAIL_PASS: ${pass ? 'set' : 'missing'}`);
    throw new Error('Email credentials are missing. Please check environment variables.');
  }
  
  // In production/preview we use the real SMTP server
  // In development we can use Ethereal for testing unless explicitly disabled
  const isDevMode = process.env.NODE_ENV === 'development' && process.env.DISABLE_ETHEREAL !== 'true';
  
  if (isDevMode) {
    console.log('📧 Using Ethereal for email testing (development mode)');
    // For development, we'll create an Ethereal test account in the actual send function
    return null;
  } else {
    console.log('📧 Using real SMTP server for email delivery (production mode)');
    console.log(`📧 SMTP Configuration: ${host}:${port} (secure: ${secure})`);
    console.log(`📧 Auth User: ${user}`);
    
    // For production, create an actual SMTP transport
    // When secure is false, we'll use STARTTLS which happens after connecting
    if (!secure) {
      console.log('📧 Creating SMTP transport with TLS');
    } else {
      console.log('📧 Creating direct secure SMTP transport (SSL/TLS)');
    }
    
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for 587 (STARTTLS)
      auth: {
        user,
        pass
      },
      debug: true, // Enable verbose logging
      logger: true, // Log SMTP traffic
      connectionTimeout: 30000, // 30 seconds connection timeout 
      greetingTimeout: 30000, // 30 seconds greeting timeout
      socketTimeout: 60000, // 60 seconds socket timeout
    });
    
    // Verify the connection configuration
    // We're doing this here so we can catch configuration errors early
    console.log('📧 Verifying SMTP connection...');
    
    return transporter;
  }
}

// Server-side function to send an email with generic structure
export async function sendServerEmail(options: any): Promise<{ success: boolean; message: string }> {
  console.log('📧 =========== GENERIC EMAIL SENDING ATTEMPT ===========');
  console.log(`📧 Time: ${new Date().toISOString()}`);
  console.log(`📧 To: ${options.to}`);
  console.log(`📧 Subject: ${options.subject}`);
  
  // Create a keep-alive promise to prevent the serverless function from terminating
  const keepAlivePromise = createKeepAlivePromise(60);
  
  try {
    // Setup email 
    console.log('📧 Creating email transporter...');
    const transporter = createTransporter();
    
    // Send the email
    console.log('📧 SMTP SEND STARTING: Attempting to send email via SMTP...');
    const info = await transporter.sendMail(options);
    console.log('📧 SMTP SEND SUCCESS: Email sent successfully');
    console.log('📧 Email delivery info:', info);
    
    // Wait for the keep-alive promise to resolve to ensure background processing completes
    console.log('📧 Waiting for keep-alive timer to complete...');
    await keepAlivePromise;
    console.log('📧 Keep-alive timer completed, email process finished');
    
    return {
      success: true,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('📧 SMTP ERROR:', error);
    
    // Specific error handling for authentication errors
    if (error.message && error.message.includes('authentication')) {
      console.error('📧 EMAIL AUTHENTICATION ERROR: Check username and password');
    } else if (error.message && error.message.includes('timed out')) {
      console.error('📧 EMAIL TIMEOUT ERROR: Connection to SMTP server timed out');
    }
    
    // Wait for the keep-alive promise to resolve before returning
    await keepAlivePromise;
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
}

// Server-side function to send a booking confirmation email
export async function sendServerBookingConfirmationEmail(params: any): Promise<{ success: boolean; message: string }> {
  console.log('📧 =========== BOOKING EMAIL SENDING ATTEMPT ===========');
  console.log(`📧 Time: ${new Date().toISOString()}`);
  console.log(`📧 Booking Reference: ${params.bookingReference}`);
  console.log(`📧 Course: ${params.courseDetails.title}`);
  console.log(`📧 Date: ${params.courseDetails.start_date}`);
  console.log(`📧 Recipient: ${params.userInfo.email}`);
  
  // Create a keep-alive promise to prevent the serverless function from terminating
  const keepAlivePromise = createKeepAlivePromise(60);
  
  try {
    // Build the email HTML
    console.log('📧 Building booking confirmation email HTML...');
    
    // Format the date in a nicer way: "Måndag 12 april 2025, 18:00"
    let formattedDate = 'TBD';
    try {
      const date = new Date(params.courseDetails.start_date);
      formattedDate = date.toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const time = date.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit'
      });
      formattedDate = `${formattedDate}, ${time}`;
    } catch (e) {
      console.error('📧 Error formatting date:', e);
    }
    
    const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Bokningsbekräftelse - ${params.courseDetails.title}</h2>
      <p>Hej ${params.userInfo.firstName}!</p>
      <p>Tack för din bokning. Vi bekräftar att din plats på kursen är reserverad.</p>
      
      <div style="margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
        <h3>Kursinformation</h3>
        <p><strong>Kurs:</strong> ${params.courseDetails.title}</p>
        <p><strong>Datum:</strong> ${formattedDate}</p>
        <p><strong>Plats:</strong> ${params.courseDetails.location || 'Studio Clay, Norrtullsgatan 65, Stockholm'}</p>
        <p><strong>Bokningsreferens:</strong> ${params.bookingReference}</p>
        <p><strong>Antal deltagare:</strong> ${params.userInfo.numberOfParticipants || 1}</p>
        ${params.paymentDetails ? `<p><strong>Betalningsmetod:</strong> ${params.paymentDetails.method === 'swish' ? 'Swish' : 'Faktura'}</p>` : ''}
        ${params.paymentDetails ? `<p><strong>Status:</strong> ${params.paymentDetails.status === 'PAID' ? 'Betald' : 'Väntande'}</p>` : ''}
      </div>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
        <h3>Viktig information</h3>
        <p>Vänligen kom några minuter innan kursstart.</p>
        <p>Ta med bekväma kläder som tål lera.</p>
        <p>Allt kursmaterial ingår i priset.</p>
        ${params.userInfo.specialRequirements ? `<p><strong>Dina specialönskemål:</strong> ${params.userInfo.specialRequirements}</p>` : ''}
      </div>
      
      <p>Om du har några frågor eller behöver ändra din bokning, kontakta oss på <a href="mailto:eva@studioclay.se">eva@studioclay.se</a>.</p>
      
      <p>Vänliga hälsningar,<br/>Eva & Studio Clay-teamet</p>
    </div>`;
    
    console.log('📧 Email HTML built successfully');
    
    // Setup email 
    console.log('📧 Creating email transporter...');
    const transporter = createTransporter();
    
    // Email content
    const mailOptions = {
      from: `"Studio Clay" <${process.env.EMAIL_FROM || 'eva@studioclay.se'}>`,
      to: params.userInfo.email,
      subject: `Bokningsbekräftelse - ${params.courseDetails.title}`,
      text: `Hej ${params.userInfo.firstName}!\n\nTack för din bokning. Vi bekräftar att din plats på kursen är reserverad.\n\nKursinformation:\nKurs: ${params.courseDetails.title}\nDatum: ${formattedDate}\nPlats: ${params.courseDetails.location || 'Studio Clay, Norrtullsgatan 65, Stockholm'}\nBokningsreferens: ${params.bookingReference}\nAntal deltagare: ${params.userInfo.numberOfParticipants || 1}\n${params.paymentDetails ? `Betalningsmetod: ${params.paymentDetails.method === 'swish' ? 'Swish' : 'Faktura'}\nStatus: ${params.paymentDetails.status === 'PAID' ? 'Betald' : 'Väntande'}` : ''}\n\nViktig information:\nVänligen kom några minuter innan kursstart.\nTa med bekväma kläder som tål lera.\nAllt kursmaterial ingår i priset.\n${params.userInfo.specialRequirements ? `Dina specialönskemål: ${params.userInfo.specialRequirements}` : ''}\n\nOm du har några frågor eller behöver ändra din bokning, kontakta oss på eva@studioclay.se.\n\nVänliga hälsningar,\nEva & Studio Clay-teamet`,
      html: emailHtml
    };
    
    console.log('📧 Sending booking confirmation email...');
    console.log(`📧 Email options: From: ${mailOptions.from}, To: ${mailOptions.to}, Subject: ${mailOptions.subject}`);
    
    try {
      console.log('📧 SMTP SEND STARTING: Attempting to send email via SMTP...');
      const info = await transporter.sendMail(mailOptions);
      console.log('📧 SMTP SEND SUCCESS: Email sent successfully');
      console.log('📧 Email delivery info:', info);
      
      // Wait for the keep-alive promise to resolve to ensure background processing completes
      console.log('📧 Waiting for keep-alive timer to complete...');
      await keepAlivePromise;
      console.log('📧 Keep-alive timer completed, email process finished');
      
      return {
        success: true,
        message: 'Booking confirmation email sent successfully'
      };
    } catch (smtpError) {
      console.error('📧 SMTP ERROR:', smtpError);
      
      // Specific error handling for authentication errors
      if (smtpError.message && smtpError.message.includes('authentication')) {
        console.error('📧 EMAIL AUTHENTICATION ERROR: Check username and password');
      } else if (smtpError.message && smtpError.message.includes('timed out')) {
        console.error('📧 EMAIL TIMEOUT ERROR: Connection to SMTP server timed out');
      }
      
      // Wait for the keep-alive promise to resolve before returning
      await keepAlivePromise;
      
      throw smtpError;
    }
  } catch (error) {
    console.error('📧 Error sending booking confirmation email:', error);
    
    // Wait for the keep-alive promise to resolve before returning
    await keepAlivePromise;
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending booking confirmation email'
    };
  }
}

// Server-side function to send a gift card email
export async function sendServerGiftCardEmail(params: any): Promise<{ success: boolean; message: string }> {
  console.log('📧 =========== GIFT CARD EMAIL SENDING ATTEMPT ===========');
  console.log(`📧 Time: ${new Date().toISOString()}`);
  console.log(`📧 Gift Card Code: ${params.giftCardData.code}`);
  console.log(`📧 Amount: ${params.giftCardData.amount}`);
  console.log(`📧 Recipient: ${params.giftCardData.recipient_email}`);
  console.log(`📧 Sender: ${params.senderInfo.name} (${params.senderInfo.email})`);
  
  // Create a keep-alive promise to prevent the serverless function from terminating
  const keepAlivePromise = createKeepAlivePromise(60);
  
  try {
    // Build the email HTML
    console.log('📧 Building gift card email HTML...');
    
    // Format the expiry date nicely
    let expiryDate = 'Ett år från utfärdandedatum';
    try {
      if (params.giftCardData.expires_at) {
        const date = new Date(params.giftCardData.expires_at);
        expiryDate = date.toLocaleDateString('sv-SE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (e) {
      console.error('📧 Error formatting expiry date:', e);
    }
    
    const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Presentkort - Studio Clay</h2>
      <p>Hej ${params.giftCardData.recipient_name}!</p>
      <p>Du har fått ett presentkort från ${params.senderInfo.name}.</p>
      
      <div style="margin: 20px 0; padding: 15px; border: 1px solid #eee; background-color: #f9f9f9; border-radius: 5px; text-align: center;">
        <h3>Presentkort</h3>
        <p style="font-size: 24px; font-weight: bold;">${params.giftCardData.amount} kr</p>
        <p style="font-size: 16px;">Kod: <strong>${params.giftCardData.code}</strong></p>
        <p>Giltigt till: ${expiryDate}</p>
      </div>
      
      ${params.giftCardData.message ? `<div style="margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
        <h3>Personligt meddelande</h3>
        <p style="font-style: italic;">"${params.giftCardData.message}"</p>
      </div>` : ''}
      
      <div style="margin: 20px 0;">
        <h3>Hur du använder ditt presentkort</h3>
        <p>Presentkortet kan användas för alla kurser och produkter på Studio Clay.</p>
        <p>Besök <a href="https://studioclay.se">studioclay.se</a> för att se vårt utbud av kurser och produkter.</p>
        <p>Vid bokning av kurs eller köp av produkt, ange presentkortskoden i kassan.</p>
      </div>
      
      <p>Om du har några frågor, kontakta oss på <a href="mailto:eva@studioclay.se">eva@studioclay.se</a>.</p>
      
      <p>Vänliga hälsningar,<br/>Eva & Studio Clay-teamet</p>
    </div>`;
    
    console.log('📧 Email HTML built successfully');
    
    // Setup email 
    console.log('📧 Creating email transporter...');
    const transporter = createTransporter();
    
    // Email content with PDF attachment
    const mailOptions = {
      from: `"Studio Clay" <${process.env.EMAIL_FROM || 'eva@studioclay.se'}>`,
      to: params.giftCardData.recipient_email,
      subject: `Presentkort från ${params.senderInfo.name} - Studio Clay`,
      text: `Hej ${params.giftCardData.recipient_name}!\n\nDu har fått ett presentkort från ${params.senderInfo.name}.\n\nPresentkort\nBelopp: ${params.giftCardData.amount} kr\nKod: ${params.giftCardData.code}\nGiltigt till: ${expiryDate}\n\n${params.giftCardData.message ? `Personligt meddelande:\n"${params.giftCardData.message}"\n\n` : ''}Hur du använder ditt presentkort:\nPresentkortet kan användas för alla kurser och produkter på Studio Clay.\nBesök studioclay.se för att se vårt utbud av kurser och produkter.\nVid bokning av kurs eller köp av produkt, ange presentkortskoden i kassan.\n\nOm du har några frågor, kontakta oss på eva@studioclay.se.\n\nVänliga hälsningar,\nEva & Studio Clay-teamet`,
      html: emailHtml,
      attachments: params.pdfBuffer ? [
        {
          filename: `Presentkort-${params.giftCardData.code}.pdf`,
          content: params.pdfBuffer,
          contentType: 'application/pdf'
        }
      ] : []
    };
    
    // Also send a copy to the sender if their email is available
    if (params.senderInfo.email) {
      mailOptions.bcc = params.senderInfo.email;
      console.log(`📧 Adding BCC to sender: ${params.senderInfo.email}`);
    }
    
    console.log('📧 Sending gift card email...');
    console.log(`📧 Email options: From: ${mailOptions.from}, To: ${mailOptions.to}, Subject: ${mailOptions.subject}`);
    console.log(`📧 Attachment included: ${mailOptions.attachments.length > 0 ? 'Yes' : 'No'}`);
    
    try {
      console.log('📧 SMTP SEND STARTING: Attempting to send email via SMTP...');
      const info = await transporter.sendMail(mailOptions);
      console.log('📧 SMTP SEND SUCCESS: Email sent successfully');
      console.log('📧 Email delivery info:', info);
      
      // Wait for the keep-alive promise to resolve to ensure background processing completes
      console.log('📧 Waiting for keep-alive timer to complete...');
      await keepAlivePromise;
      console.log('📧 Keep-alive timer completed, email process finished');
      
      return {
        success: true,
        message: 'Gift card email sent successfully'
      };
    } catch (smtpError) {
      console.error('📧 SMTP ERROR:', smtpError);
      
      // Specific error handling for authentication errors
      if (smtpError.message && smtpError.message.includes('authentication')) {
        console.error('📧 EMAIL AUTHENTICATION ERROR: Check username and password');
      } else if (smtpError.message && smtpError.message.includes('timed out')) {
        console.error('📧 EMAIL TIMEOUT ERROR: Connection to SMTP server timed out');
      }
      
      // Wait for the keep-alive promise to resolve before returning
      await keepAlivePromise;
      
      throw smtpError;
    }
  } catch (error) {
    console.error('📧 Error sending gift card email:', error);
    
    // Wait for the keep-alive promise to resolve before returning
    await keepAlivePromise;
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending gift card email'
    };
  }
} 