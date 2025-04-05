import nodemailer from 'nodemailer';
import { UserInfo, PaymentDetails } from '@/types/booking';

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
    // Calculate due date (10 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    const formattedDueDate = dueDate.toLocaleDateString('sv-SE'); // Swedish format: YYYY-MM-DD
    
    // Course information
    const courseDate = new Date(params.courseDetails.start_date).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Total price calculation - fixed to ensure it's calculated properly
    const numParticipants = parseInt(params.userInfo.numberOfParticipants) || 1;
    const unitPrice = params.courseDetails.price || 0;
    const totalPrice = numParticipants * unitPrice;
    
    // Create HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #547264;">Bekräftelse - Studio Clay</h2>
        <p>Hej ${params.userInfo.firstName},</p>
        <p>Tack för din bokning av kursen "${params.courseDetails.title}". Bifogat hittar du fakturan för din bokning.</p>
        
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Kursdetaljer</h3>
          <p><strong>Kurs:</strong> ${params.courseDetails.title}</p>
          <p><strong>Datum:</strong> ${courseDate}</p>
          ${params.courseDetails.location ? `<p><strong>Plats:</strong> ${params.courseDetails.location}</p>` : ''}
          <p><strong>Antal deltagare:</strong> ${numParticipants}</p>
          <p><strong>Pris per deltagare:</strong> ${unitPrice.toFixed(2)} kr</p>
          <p><strong>Totalt pris:</strong> ${totalPrice.toFixed(2)} kr</p>
        </div>

        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Fakturainformation</h3>
          <p><strong>Fakturanummer:</strong> ${params.invoiceNumber}</p>
          <p><strong>Förfallodatum:</strong> ${formattedDueDate}</p>
          <p><strong>Att betala:</strong> ${totalPrice.toFixed(2)} kr</p>
        </div>
        
        <p>Vänligen betala fakturan inom 10 dagar till vårt bankgiro: 5938-4560.</p>
        <p>Ange ditt namn (${params.userInfo.firstName} ${params.userInfo.lastName}) som referens vid betalning.</p>
        
        <p>Om du har några frågor, vänligen kontakta oss på <a href="mailto:eva@studioclay.se">eva@studioclay.se</a> eller ring 079-312 06 05.</p>
        <p>Vänliga hälsningar,<br>Studio Clay</p>
      </div>
    `;
    
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
      subject: `Bekräftelse för ${params.courseDetails.title} - ${params.invoiceNumber}`,
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
    // Format the course date
    const courseDate = new Date(params.courseDetails.start_date).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Calculate total price - fixed to ensure it's calculated properly
    const numParticipants = parseInt(params.userInfo.numberOfParticipants) || 1;
    const unitPrice = params.courseDetails.price || 0;
    const totalPrice = numParticipants * unitPrice;
    
    // Create specific payment information based on payment method
    let paymentMethodText = '';
    let paymentDetailsText = '';
    
    if (params.paymentDetails.method === 'swish') {
      paymentMethodText = 'Swish';
      paymentDetailsText = params.paymentDetails.paymentReference 
        ? `Betalning genomförd med Swish. Betalningsreferens: ${params.paymentDetails.paymentReference}`
        : 'Betalning genomförd med Swish.';
    } else if (params.paymentDetails.method === 'invoice') {
      paymentMethodText = 'Faktura';
      paymentDetailsText = params.paymentDetails.invoiceNumber 
        ? `En faktura (${params.paymentDetails.invoiceNumber}) har skickats till din e-post och ska betalas inom 10 dagar.`
        : 'En faktura har skickats till din e-post och ska betalas inom 10 dagar.';
    } else {
      paymentMethodText = params.paymentDetails.method || 'Okänd';
      paymentDetailsText = 'Betalningsinformation har registrerats.';
    }
    
    // Create HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #547264;">Bokningsbekräftelse</h2>
        <p>Hej ${params.userInfo.firstName},</p>
        <p>Tack för din bokning hos Studio Clay! Din plats är nu reserverad.</p>
        
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Kursdetaljer</h3>
          <p><strong>Kurs:</strong> ${params.courseDetails.title}</p>
          <p><strong>Datum:</strong> ${courseDate}</p>
          ${params.courseDetails.location ? `<p><strong>Plats:</strong> ${params.courseDetails.location}</p>` : ''}
          <p><strong>Antal deltagare:</strong> ${numParticipants}</p>
          <p><strong>Pris per deltagare:</strong> ${unitPrice.toFixed(2)} kr</p>
          <p><strong>Totalt pris:</strong> ${totalPrice.toFixed(2)} kr</p>
        </div>
        
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Betalningsinformation</h3>
          <p><strong>Betalningsmetod:</strong> ${paymentMethodText}</p>
          <p>${paymentDetailsText}</p>
        </div>
        
        <p>Din bokningsreferens: <strong>${params.bookingReference}</strong></p>
        <p>Om du har några frågor, vänligen kontakta oss på <a href="mailto:eva@studioclay.se">eva@studioclay.se</a> eller ring 079-312 06 05.</p>
        <p>Vi ser fram emot att träffa dig!</p>
        <p>Vänliga hälsningar,<br>Studio Clay</p>
      </div>
    `;
    
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
    console.log('Sending gift card email...');
    
    // If PDF buffer is provided, log its size
    if (params.pdfBuffer) {
      console.log(`Gift card PDF size: ${params.pdfBuffer.length} bytes`);
    } else {
      console.log('No PDF buffer provided for gift card email');
    }
    
    // Format expiration date
    let expirationDate = 'never';
    if (params.giftCardData.expires_at) {
      try {
        expirationDate = new Date(params.giftCardData.expires_at).toLocaleDateString('sv-SE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        console.error('Error formatting expiration date:', e);
      }
    }
    
    // Format amount with currency
    const amount = `${params.giftCardData.amount.toFixed(2)} kr`;
    
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
    
    // Sender name for display in email content
    const senderName = params.senderInfo?.name || 'Studio Clay';
    
    // Create HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #547264;">Presentkort från Studio Clay</h2>
        <p>Hej ${params.giftCardData.recipient_name},</p>
        <p>Du har fått ett presentkort från ${senderName}.</p>
        
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Presentkortets värde: ${amount}</h3>
          <p><strong>Presentkortskod:</strong> ${params.giftCardData.code}</p>
          <p><strong>Giltigt till:</strong> ${expirationDate}</p>
        </div>
        
        ${params.giftCardData.message ? `
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Meddelande från ${senderName}</h3>
          <p>${params.giftCardData.message}</p>
        </div>
        ` : ''}
        
        <p>Du kan använda presentkortet när du bokar kurser eller köper produkter på <a href="https://studioclay.se">studioclay.se</a>.</p>
        <p>Presentkortet finns bifogat som en PDF-fil som du kan skriva ut om du vill.</p>
        
        <p>Vänliga hälsningar,<br>Studio Clay</p>
      </div>
    `;
    
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