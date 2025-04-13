import nodemailer from 'nodemailer';
import { UserInfo, PaymentDetails } from '@/types/booking';
import { buildConfirmationEmail } from '@/utils/emailBuilder';
import { promisify } from 'util';
import { readFile } from 'fs';
import path from 'path';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logDebug, logError, logInfo } from '@/lib/logging';
import { PRODUCT_TYPES, getValidProductType } from '@/constants/statusCodes';

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
  bccEmail: process.env.BCC_EMAIL || '',
  from: process.env.EMAIL_FROM || 'info@studioclay.se'
};

// Longer keep-alive timer for email sending (30 seconds instead of 15)
const EMAIL_KEEP_ALIVE_MS = 30000;

// Simple format price helper function to avoid import dependency
function formatPrice(price: number): string {
  return price.toLocaleString('sv-SE');
}

// Helper function to create a keep-alive promise
const createKeepAlivePromise = (timeInMs = EMAIL_KEEP_ALIVE_MS): Promise<void> => {
  console.log(`📧 KEEP-ALIVE: Creating email keep-alive timer for ${timeInMs}ms`);
  return new Promise(resolve => {
    const timerId = setTimeout(() => {
      console.log('📧 KEEP-ALIVE: Email timer finished, resolving promise');
      resolve();
    }, timeInMs);
    
    // Ensure timer isn't lost to garbage collection - fix TypeScript errors
    const globalAny = global as any;
    globalAny.setTimeout = globalAny.setTimeout || setTimeout;
    if (!globalAny.keepAliveTimers) {
      globalAny.keepAliveTimers = [];
    }
    globalAny.keepAliveTimers.push(timerId);
  });
};

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
    const keepAlivePromise = createKeepAlivePromise();
    
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
    const keepAlivePromise = createKeepAlivePromise();
    
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
    const keepAlivePromise = createKeepAlivePromise();
    
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
    const keepAlivePromise = createKeepAlivePromise();
    
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

/**
 * Server Email Module
 * 
 * Hanterar e-postmeddelanden som skickas från servern. Detta inkluderar:
 * - Bekräftelse av bokningar
 * - Fakturor
 * - Presentkort
 */

// Standardsvar från e-postfunktioner
interface EmailResult {
  success: boolean;
  message: string;
  messageId?: string;
}

/**
 * Skickar e-post med faktura till kunden
 */
export async function sendEmailWithInvoice(data: {
  userInfo: any;
  invoiceNumber: string;
  paymentReference: string;
  productType: string;
  pdfBlob?: Blob;
  giftCardPdfUrl?: string;
  courseDetails?: any;
  artProduct?: any;
  giftCardDetails?: any;
}): Promise<EmailResult> {
  const requestId = data.paymentReference;
  
  try {
    logInfo(`Preparing to send invoice email`, { requestId });
    
    // Validera e-postmottagare
    const recipientEmail = data.userInfo.email;
    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new Error(`Invalid recipient email: ${recipientEmail}`);
    }
    
    // Skapa e-posttransport
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth
    });
    
    // Förbered bifogad faktura-PDF om den finns
    const attachments = [];
    
    if (data.pdfBlob) {
      logDebug(`Adding invoice PDF attachment`, { requestId });
      
      // Konvertera PDF-blob till buffer
      const arrayBuffer = await data.pdfBlob.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      
      attachments.push({
        filename: `faktura-${data.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }
    
    // Generera ämnesrad och innehåll baserat på produkttyp
    const validProductType = getValidProductType(data.productType);
    let subject = '';
    let htmlContent = '';
    
    if (validProductType === PRODUCT_TYPES.COURSE) {
      // Kursbokningar
      const courseTitle = data.courseDetails?.title || 'din kurs';
      subject = `Din faktura för bokning av ${courseTitle}`;
      
      // Formatera kursdatum om det finns
      let formattedDate = '';
      if (data.courseDetails?.start_date) {
        const courseDate = new Date(data.courseDetails.start_date);
        formattedDate = courseDate.toLocaleDateString('sv-SE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // HTML-innehåll för kursbokningar
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #42857a;">Tack för din bokning!</h1>
          <p>Hej ${data.userInfo.firstName},</p>
          <p>Tack för din bokning av kursen "${courseTitle}"${formattedDate ? ` den ${formattedDate}` : ''}.</p>
          <p>Din faktura är bifogad i detta e-postmeddelande. Betalningsvillkor är 14 dagar.</p>
          <p><strong>Fakturanummer:</strong> ${data.invoiceNumber}</p>
          <p><strong>Betalningsreferens:</strong> ${data.paymentReference}</p>
          <p>Vi ser fram emot att träffa dig på kursen!</p>
          <p>Vänliga hälsningar,<br>Studio Clay</p>
        </div>
      `;
    } else if (validProductType === PRODUCT_TYPES.GIFT_CARD) {
      // Presentkort
      subject = 'Ditt presentkort från Studio Clay';
      
      // HTML-innehåll för presentkort
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #42857a;">Tack för ditt köp av presentkort!</h1>
          <p>Hej ${data.userInfo.firstName},</p>
          <p>Tack för ditt köp av presentkort till Studio Clay på ${data.giftCardDetails?.amount || ''} kr.</p>
          <p>Din faktura är bifogad i detta e-postmeddelande. Betalningsvillkor är 14 dagar.</p>
          <p><strong>Fakturanummer:</strong> ${data.invoiceNumber}</p>
          <p><strong>Betalningsreferens:</strong> ${data.paymentReference}</p>
          ${data.giftCardDetails?.code ? `<p><strong>Presentkortskod:</strong> ${data.giftCardDetails.code}</p>` : ''}
          <p>Efter betalning kan presentkortet användas för att boka kurser eller köpa produkter på vår hemsida.</p>
          <p>Vänliga hälsningar,<br>Studio Clay</p>
        </div>
      `;
      
      // Lägg till länk till presentkorts-PDF om det finns
      if (data.giftCardPdfUrl) {
        htmlContent += `
          <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
            <p>Du kan ladda ner ditt presentkort som PDF genom att <a href="${data.giftCardPdfUrl}" target="_blank">klicka här</a>.</p>
          </div>
        `;
      }
    } else if (validProductType === PRODUCT_TYPES.ART_PRODUCT) {
      // Konstprodukt
      const productName = data.artProduct?.name || 'din produkt';
      subject = `Din faktura för köp av ${productName}`;
      
      // HTML-innehåll för konstprodukter
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #42857a;">Tack för ditt köp!</h1>
          <p>Hej ${data.userInfo.firstName},</p>
          <p>Tack för ditt köp av "${productName}".</p>
          <p>Din faktura är bifogad i detta e-postmeddelande. Betalningsvillkor är 14 dagar.</p>
          <p><strong>Fakturanummer:</strong> ${data.invoiceNumber}</p>
          <p><strong>Betalningsreferens:</strong> ${data.paymentReference}</p>
          <p>Vi kommer att kontakta dig angående leverans efter att betalningen har mottagits.</p>
          <p>Vänliga hälsningar,<br>Studio Clay</p>
        </div>
      `;
    } else {
      // Generisk
      subject = 'Din faktura från Studio Clay';
      
      // Generiskt HTML-innehåll
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #42857a;">Tack för ditt köp!</h1>
          <p>Hej ${data.userInfo.firstName},</p>
          <p>Tack för ditt köp från Studio Clay.</p>
          <p>Din faktura är bifogad i detta e-postmeddelande. Betalningsvillkor är 14 dagar.</p>
          <p><strong>Fakturanummer:</strong> ${data.invoiceNumber}</p>
          <p><strong>Betalningsreferens:</strong> ${data.paymentReference}</p>
          <p>Vänliga hälsningar,<br>Studio Clay</p>
        </div>
      `;
    }
    
    // Skicka e-postmeddelande
    const mailOptions = {
      from: `"Studio Clay" <${emailConfig.from}>`,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      attachments: attachments
    };
    
    logDebug(`Sending email to ${recipientEmail}`, { 
      requestId,
      subject,
      hasAttachments: attachments.length > 0 
    });
    
    // Faktiskt skicka e-post
    const info = await transporter.sendMail(mailOptions);
    
    logInfo(`Successfully sent email`, {
      requestId,
      messageId: info.messageId,
      recipient: recipientEmail
    });
    
    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    };
    
  } catch (error) {
    logError(`Failed to send invoice email`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
}

/**
 * Skickar en bekräftelse på bokning via e-post
 */
export async function sendBookingConfirmation(data: {
  email: string;
  name: string;
  bookingReference: string;
  courseTitle: string;
  courseDate: string;
  participants: number;
}): Promise<EmailResult> {
  try {
    // Skapa e-posttransport
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth
    });
    
    // HTML-innehåll för bokningsbekräftelse
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #42857a;">Bokningsbekräftelse</h1>
        <p>Hej ${data.name},</p>
        <p>Vi bekräftar härmed din bokning av kursen "${data.courseTitle}" den ${data.courseDate}.</p>
        <p><strong>Antal deltagare:</strong> ${data.participants}</p>
        <p><strong>Bokningsreferens:</strong> ${data.bookingReference}</p>
        <p>Vi ser fram emot att träffa dig på kursen!</p>
        <p>Vänliga hälsningar,<br>Studio Clay</p>
      </div>
    `;
    
    // Skicka e-postmeddelande
    const mailOptions = {
      from: `"Studio Clay" <${emailConfig.from}>`,
      to: data.email,
      subject: `Bokningsbekräftelse - ${data.courseTitle}`,
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'Booking confirmation email sent successfully',
      messageId: info.messageId
    };
    
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending booking confirmation'
    };
  }
} 