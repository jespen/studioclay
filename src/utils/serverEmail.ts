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
  from: process.env.EMAIL_FROM || 'eva@studioclay.se',
  tls: {
    rejectUnauthorized: process.env.EMAIL_REJECT_UNAUTHORIZED !== 'false'
  }
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

// Configure nodemailer for server-side email sending
const createTransporter = () => {
  // Get email configuration from environment variables
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.office365.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'eva@studioclay.se',
      // Use email password from environment variables
      pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: process.env.EMAIL_REJECT_UNAUTHORIZED !== 'false'
    }
  };
  
  // För debug
  console.log('Email configuration:', {
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    user: emailConfig.auth.user,
    hasPassword: !!emailConfig.auth.pass
  });
  
  // För utveckling - vi kan antingen använda konsolloggning eller skicka riktiga e-postmeddelanden
  // Vi ändrar detta för att ALLTID skicka riktiga e-postmeddelanden, även i utveckling
  // såvida inte DISABLE_EMAIL_SENDING är explicit satt till 'true'
  if (process.env.DISABLE_EMAIL_SENDING === 'true') {
    console.log('EMAIL SENDING IS DISABLED (DISABLE_EMAIL_SENDING=true). Email would be sent with these settings:', emailConfig);
    
    // Skapa en mock-transporter som bara loggar
    return {
      sendMail: (options: any) => {
        console.log('MOCK EMAIL SENT:', {
          to: options.to,
          from: options.from,
          subject: options.subject,
          hasHtml: !!options.html,
          hasAttachments: options.attachments && options.attachments.length > 0,
          attachments: options.attachments ? options.attachments.map((a: any) => ({
            filename: a.filename,
            contentLength: a.content ? a.content.length : 'unknown'
          })) : []
        });
        
        // Returnera ett mock-lyckat svar
        return Promise.resolve({
          messageId: 'mock-message-id-' + Date.now(),
          response: 'Mock email success',
          accepted: [options.to],
          rejected: [],
          pending: [],
          envelope: { from: options.from, to: [options.to] },
          raw: { messageId: 'mock-raw-id-' + Date.now() }
        });
      },
      verify: () => Promise.resolve(true)
    };
  }
  
  // För verklig e-postsändning
  try {
    console.log('Creating real email transporter with SMTP settings');
    // Skapa transporter
    return nodemailer.createTransport(emailConfig);
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
};

// Common email settings
const emailSettings = {
  from: process.env.EMAIL_USER || 'eva@studioclay.se', // Use the authenticated email as sender
  replyTo: process.env.EMAIL_REPLY_TO || 'info@studioclay.se', // Keep the reply-to as info@
  bcc: process.env.EMAIL_BCC
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
    console.log(`📧 Payment Reference: ${params.invoiceNumber}`);
    console.log(`📧 Has Gift Card PDF: ${params.giftCardPdfBuffer ? 'Yes' : 'No'}`);
  }
  
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.error('📧 Failed to create email transporter');
      return { success: false, message: 'Failed to create email transporter' };
    }
    
    // Get authenticated user email for "from" field
    const authenticatedEmail = emailSettings.from;
    
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
        filename: `Presentkort-${params.invoiceNumber}.pdf`,
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
  console.log(`📧 Payment Reference: ${params.giftCardData.code}`);
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
    const transporter = createTransporter();
    
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
    const authenticatedEmail = emailSettings.from;
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
  console.log('📧 =========== PRODUCT ORDER EMAIL SENDING ATTEMPT ===========');
  console.log(`📧 Time: ${new Date().toISOString()}`);
  console.log(`📧 Booking Reference: ${params.bookingReference}`);
  console.log(`📧 Course: ${params.courseDetails.title}`);
  console.log(`📧 Recipient: ${params.userInfo.email}`);
  
  try {
    // Build email HTML using the modular template system
    console.log(`📧 Building product order confirmation email HTML...`);
    const htmlContent = buildConfirmationEmail({
      productType: 'product',
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
        console.log('📧 DEV MODE: Product order email would be sent to:', params.userInfo.email);
        console.log('📧 DEV MODE: Subject would be:', `Orderbekräftelse - ${params.courseDetails.title}`);
      } else {
        // PRODUCTION ERROR: Email cannot be sent
        console.error('📧 CRITICAL PRODUCTION ERROR: Cannot send product order email due to missing transporter ❌');
        console.error(`📧 Product order email to ${params.userInfo.email} could not be sent`);
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
      subject: `Orderbekräftelse - ${params.courseDetails.title}`,
      html: htmlContent,
      bcc: process.env.BCC_EMAIL || undefined
    };
    
    // Send email
    console.log(`📧 Sending product order confirmation email to: ${params.userInfo.email}`);
    console.log(`📧 Email subject: Orderbekräftelse - ${params.courseDetails.title}`);
    console.log(`📧 BCC: ${process.env.BCC_EMAIL || 'None'}`);
    
    // Create a keep-alive timer to keep the function running while nodemailer does its work
    const keepAlivePromise = createKeepAlivePromise();
    
    try {
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`📧 ✅ Product order confirmation email sent successfully!`);
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
      message: error instanceof Error ? error.message : 'Unknown error sending product order email'
    };
  }
}