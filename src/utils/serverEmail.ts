import nodemailer from 'nodemailer';
import { UserInfo, PaymentDetails } from '@/types/booking';
import { buildConfirmationEmail } from '@/utils/emailBuilder';

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

// Function to log detailed SMTP errors
function logSMTPError(error: any) {
  console.error('📧 SMTP ERROR DETAILS:');
  
  if (error && typeof error === 'object') {
    console.error(`📧 Error code: ${error.code || 'Unknown'}`);
    console.error(`📧 Server response: ${error.response || 'No response'}`);
    console.error(`📧 Response code: ${error.responseCode || 'No code'}`);
    console.error(`📧 Failed command: ${error.command || 'Unknown command'}`);
    console.error(`📧 Error number: ${error.errno || 'Unknown'}`);
    console.error(`📧 System call: ${error.syscall || 'Unknown'}`);
    console.error(`📧 Hostname: ${error.hostname || 'Unknown'}`);
    console.error(`📧 Port: ${error.port || 'Unknown'}`);
    console.error(`📧 Stack trace: ${error.stack || 'No stack trace'}`);
  } else {
    console.error(`📧 Unknown error type: ${error}`);
  }
}

// Create a reusable transporter
const createTransporter = async () => {
  // Log environment variables (without sensitive data)
  console.log('📧 Email Configuration:');
  console.log(`📧 SMTP Host: ${process.env.EMAIL_SMTP_HOST || 'smtp.office365.com'}`);
  console.log(`📧 SMTP Port: ${process.env.EMAIL_SMTP_PORT || '587'}`);
  console.log(`📧 SMTP Secure: ${process.env.EMAIL_SMTP_SECURE || 'false'}`);
  console.log(`📧 Email User: ${process.env.EMAIL_USER || 'eva@studioclay.se'}`);
  console.log(`📧 Email Pass: ${process.env.EMAIL_PASS ? '********' : 'Not set'}`);
  console.log(`📧 BCC Email: ${process.env.BCC_EMAIL || 'Not set'}`);
  console.log(`📧 Node Environment: ${process.env.NODE_ENV || 'Not set'}`);

  // Skip Ethereal if disabled or in production
  if (process.env.DISABLE_ETHEREAL === 'true' || process.env.NODE_ENV === 'production') {
    console.log('📧 Using Office 365 SMTP server for email delivery');
    
    const host = process.env.EMAIL_SMTP_HOST || 'smtp.office365.com';
    const port = parseInt(process.env.EMAIL_SMTP_PORT || '587');
    const user = process.env.EMAIL_USER || 'eva@studioclay.se';
    const pass = process.env.EMAIL_PASS || '';
    const secure = process.env.EMAIL_SMTP_SECURE === 'true';
    
    // Log the SMTP configuration
    console.log(`📧 SMTP Configuration: ${host}:${port}`);
    console.log(`📧 Auth User: ${user}`);
    
    // Validate email credentials before attempting to create transporter
    if (!user || !pass) {
      console.error('📧 ERROR: Missing email credentials. Check your .env.local file.');
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
        debug: true
      });
      
      // Verify connection configuration
      console.log('📧 Verifying SMTP connection...');
      await transport.verify();
      console.log('📧 SMTP server connection verified successfully');
      
      return transport;
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
          debug: true
        });
        
        console.log('📧 Verifying SSL connection...');
        await sslTransport.verify();
        console.log('📧 SMTP SSL connection verified successfully');
        
        return sslTransport;
      } catch (sslError) {
        console.error('📧 All SMTP connection attempts failed:', sslError);
        logSMTPError(sslError);
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
    
    // Create reusable transporter
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('No transporter available, simulating email send');
      return {
        success: false,
        message: 'Email transporter not available'
      };
    }
    
    // For Office 365, use a simplified from address that exactly matches the authenticated user
    const authenticatedEmail = process.env.EMAIL_USER;
    
    // Create email attachments array
    const attachments = [];
    
    // Add invoice PDF if available
    if (params.pdfBuffer) {
      attachments.push({
        filename: `Faktura-${params.invoiceNumber}.pdf`,
        content: params.pdfBuffer,
        contentType: 'application/pdf'
      });
    }
    
    // Add gift card PDF if this is a gift card purchase and we have the PDF
    if (params.isGiftCard && params.giftCardPdfBuffer && params.giftCardCode) {
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
    console.log('Sending invoice email to:', params.userInfo.email);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Invoice email sent successfully:', info.messageId);
    
    // Check if this is a test email from Ethereal
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('Test email URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      message: 'Invoice email sent successfully'
    };
  } catch (error) {
    console.error('Error sending server invoice email:', error);
    logSMTPError(error);
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
  try {
    // Build email HTML using the modular template system
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
    
    // Create reusable transporter
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('No transporter available, simulating email send');
      return {
        success: false,
        message: 'Email transporter not available'
      };
    }
    
    // For Office 365, use a simplified from address that exactly matches the authenticated user
    const authenticatedEmail = process.env.EMAIL_USER;
    
    // Create email options
    const mailOptions = {
      from: authenticatedEmail,
      to: params.userInfo.email,
      subject: `Bokningsbekräftelse - ${params.courseDetails.title}`,
      html: htmlContent,
      bcc: process.env.BCC_EMAIL || undefined
    };
    
    // Send email
    console.log('Sending booking confirmation email to:', params.userInfo.email);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Booking confirmation email sent successfully:', info.messageId);
    
    // Check if this is a test email from Ethereal
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('Test email URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      message: 'Booking confirmation email sent successfully'
    };
  } catch (error) {
    console.error('Error sending server booking confirmation email:', error);
    logSMTPError(error);
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
  try {
    // Build email HTML using the modular template system
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
    
    // Create reusable transporter
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('No transporter available, simulating email send');
      return {
        success: false,
        message: 'Email transporter not available'
      };
    }
    
    // For Office 365, use a simplified from address that exactly matches the authenticated user
    const authenticatedEmail = process.env.EMAIL_USER;
    
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
    console.log('Sending gift card confirmation email to purchaser:', params.senderInfo.email);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Gift card confirmation email sent successfully:', info.messageId);
    
    // Check if this is a test email from Ethereal
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('Test email URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      message: 'Gift card confirmation email sent successfully'
    };
    
  } catch (error) {
    console.error('Error sending gift card confirmation email:', error);
    logSMTPError(error);
    
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
  try {
    // Build email HTML using the modular template system
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
    
    // Create reusable transporter
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('No transporter available, simulating email send');
      return {
        success: false,
        message: 'Email transporter not available'
      };
    }
    
    // For Office 365, use a simplified from address that exactly matches the authenticated user
    const authenticatedEmail = process.env.EMAIL_USER;
    
    // Create email options
    const mailOptions = {
      from: authenticatedEmail,
      to: params.userInfo.email,
      subject: `Orderbekräftelse - Studio Clay`,
      html: htmlContent,
      bcc: process.env.BCC_EMAIL || undefined
    };
    
    // Send email
    console.log('Sending product order confirmation email to:', params.userInfo.email);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Product order confirmation email sent successfully:', info.messageId);
    
    // Check if this is a test email from Ethereal
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('Test email URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      message: 'Product order confirmation email sent successfully'
    };
  } catch (error) {
    console.error('Error sending product order confirmation email:', error);
    logSMTPError(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending product order confirmation email'
    };
  }
} 