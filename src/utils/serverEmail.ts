import nodemailer from 'nodemailer';
import { UserInfo, PaymentDetails } from '@/types/booking';
import { buildConfirmationEmail } from '@/utils/emailBuilder';

// Email configuration for server-side sending
const emailConfig = {
  // SMTP settings (for actual deployment, store these in .env variables)
  host: process.env.EMAIL_SMTP_HOST || 'smtpout.secureserver.net',
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
    
    // Special handling for Office 365
    if (host.includes('office365') || host.includes('outlook')) {
      console.log('📧 Using Office 365 specific configuration');
      try {
        const transporter = nodemailer.createTransport({
          host: host,
          port: port,
          secure: false, // TLS requires secure:false for Office 365
          auth: {
            user: user,
            pass: pass,
          },
          tls: {
            // Microsoft recommends TLS 1.2
            minVersion: 'TLSv1.2',
            // Trust any certificate since Office 365 uses valid certs
            rejectUnauthorized: true
          },
          debug: true // Enable debug output for troubleshooting
        });
        
        // Verify connection configuration
        await transporter.verify();
        console.log('📧 Office 365 SMTP server connection verified successfully');
        return transporter;
      } catch (error) {
        console.error('📧 Error verifying Office 365 SMTP connection:', error);
        logSMTPError(error);
        throw error;
      }
    }
    
    // Regular SMTP configuration for other providers
    console.log('📧 Creating SMTP transport with plain password (secure)');
    
    try {
      // Create standard transport using standard options
      const transport = nodemailer.createTransport({
        host: host,
        port: port,
        secure: secure,
        auth: {
          user: user,
          pass: pass
        },
        debug: true
      });
      
      // Verify connection configuration
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
}): Promise<{ success: boolean; message: string }> {
  try {
    // Build email HTML using the modular template system
    const htmlContent = buildConfirmationEmail({
      productType: 'course',
      userInfo: params.userInfo,
      paymentDetails: {
        method: 'invoice',
        status: 'pending',
        invoiceNumber: params.invoiceNumber,
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
    
    // Create email options
    const mailOptions = {
      from: authenticatedEmail,
      to: params.userInfo.email,
      subject: `Bokningsbekräftelse - ${params.courseDetails.title}`,
      html: htmlContent,
      bcc: process.env.BCC_EMAIL || undefined,
      attachments: params.pdfBuffer ? [
        {
          filename: `Faktura-${params.invoiceNumber}.pdf`,
          content: params.pdfBuffer,
          contentType: 'application/pdf'
        }
      ] : undefined
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
        firstName: params.giftCardData.recipient_name,
        lastName: '',
        email: params.giftCardData.recipient_email
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
    
    // Sender name for display
    const senderName = params.senderInfo?.name || 'Studio Clay';
    
    // Create email options
    const mailOptions = {
      from: authenticatedEmail,
      to: params.giftCardData.recipient_email,
      subject: `Presentkort från ${senderName} - Studio Clay`,
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
    console.log('Sending gift card email to:', params.giftCardData.recipient_email);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Gift card email sent successfully:', info.messageId);
    
    // Check if this is a test email from Ethereal
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('Test email URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      message: 'Gift card email sent successfully'
    };
    
  } catch (error) {
    console.error('Error sending gift card email:', error);
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
      subject: `Orderbekräftelse - ${params.productDetails.title}`,
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