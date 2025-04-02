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

// Create a reusable transporter
const createTransporter = async () => {
  // Skip Ethereal if disabled or in production
  if (process.env.DISABLE_ETHEREAL === 'true' || process.env.NODE_ENV === 'production') {
    console.log('📧 Using GoDaddy SMTP server for email delivery');
    console.log(`📧 SMTP Configuration: ${emailConfig.host}:${emailConfig.port}`);
    console.log(`📧 Auth User: ${emailConfig.auth.user}`);
    
    // Validate email credentials before attempting to create transporter
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.error('📧 ERROR: Missing email credentials. Check your .env.local file.');
      return null;
    }
    
    // Plain password method only - previous methods caused auth failures
    console.log('📧 Creating SMTP transport with plain password (secure)');
    
    try {
      // Create GoDaddy transport using standard options
      const transport = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.auth.user,
          pass: emailConfig.auth.pass
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
          host: emailConfig.host,
          port: 465, // Standard secure SMTP port
          secure: true, // Use SSL
          auth: {
            user: emailConfig.auth.user,
            pass: emailConfig.auth.pass
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
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
  });
};

/**
 * Helper function to log detailed error information for SMTP issues
 */
function logSMTPError(error: any) {
  console.error('📧 SMTP ERROR DETAILS:');
  
  if (error.code) {
    console.error(`📧 Error code: ${error.code}`);
  }
  
  if (error.response) {
    console.error(`📧 Server response: ${error.response}`);
  }
  
  if (error.responseCode) {
    console.error(`📧 Response code: ${error.responseCode}`);
  }
  
  if (error.command) {
    console.error(`📧 Failed command: ${error.command}`);
  }
  
  if (error.errno) {
    console.error(`📧 Error number: ${error.errno}`);
  }
  
  if (error.syscall) {
    console.error(`📧 System call: ${error.syscall}`);
  }
  
  if (error.hostname) {
    console.error(`📧 Hostname: ${error.hostname}`);
  }
  
  if (error.port) {
    console.error(`📧 Port: ${error.port}`);
  }
  
  if (error.stack) {
    console.error(`📧 Stack trace: ${error.stack}`);
  }
}

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
        <h2 style="color: #547264;">Faktura - Studio Clay</h2>
        <p>Hej ${params.userInfo.firstName},</p>
        <p>Tack för din bokning av kursen "${params.courseDetails.title}". Bifogat hittar du fakturan för din bokning.</p>
        
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Fakturainformation</h3>
          <p><strong>Fakturanummer:</strong> ${params.invoiceNumber}</p>
          <p><strong>Förfallodatum:</strong> ${formattedDueDate}</p>
          <p><strong>Att betala:</strong> ${totalPrice.toFixed(2)} kr</p>
        </div>
        
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Kursdetaljer</h3>
          <p><strong>Kurs:</strong> ${params.courseDetails.title}</p>
          <p><strong>Datum:</strong> ${courseDate}</p>
          ${params.courseDetails.location ? `<p><strong>Plats:</strong> ${params.courseDetails.location}</p>` : ''}
          <p><strong>Antal deltagare:</strong> ${numParticipants}</p>
          <p><strong>Pris per deltagare:</strong> ${unitPrice.toFixed(2)} kr</p>
          <p><strong>Totalt pris:</strong> ${totalPrice.toFixed(2)} kr</p>
        </div>
        
        <p>Vänligen betala fakturan inom 10 dagar till vårt bankgiro: 5938-4560.</p>
        <p>Ange ditt namn (${params.userInfo.firstName} ${params.userInfo.lastName}) som referens vid betalning.</p>
        
        <p>Om du har några frågor, vänligen kontakta oss på <a href="mailto:eva@studioclay.se">eva@studioclay.se</a> eller ring 079-312 06 05.</p>
        <p>Vänliga hälsningar,<br>Studio Clay</p>
      </div>
    `;
    
    // Create email options
    const mailOptions = {
      from: emailConfig.studioClayEmail,
      to: params.userInfo.email,
      subject: `Faktura för ${params.courseDetails.title} - ${params.invoiceNumber}`,
      html: htmlContent,
      bcc: emailConfig.bccEmail || undefined,
      attachments: params.pdfBuffer ? [
        {
          filename: `Faktura-${params.invoiceNumber}.pdf`,
          content: params.pdfBuffer,
          contentType: 'application/pdf'
        }
      ] : undefined
    };
    
    // Create transporter and send email
    const transporter = await createTransporter();
    
    // If no transporter could be created
    if (!transporter) {
      console.log('Failed to create email transporter, simulating email instead');
      return {
        success: true,
        message: 'Email simulated (transporter creation failed)'
      };
    }
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Invoice email sent:', info.messageId);
    
    // If using Ethereal, log the URL where the email can be viewed
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      try {
        // Check if this is an Ethereal email account (test account)
        if (info.envelope && info.envelope.from && 
            typeof info.envelope.from === 'string' && 
            info.envelope.from.includes('ethereal.email')) {
          // @ts-ignore - typingsfel i nodemailer mellan olika versioner
          const testUrl = nodemailer.getTestMessageUrl(info);
          if (testUrl) {
            console.log('📧 INVOICE EMAIL VIEW URL: ' + testUrl);
          }
        } else {
          console.log('📧 Real email sent, no preview URL available');
        }
      } catch (error) {
        console.log('📧 Unable to get test message URL:', error);
      }
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
    
    // Create email options
    const mailOptions = {
      from: emailConfig.studioClayEmail,
      to: params.userInfo.email,
      subject: `Bokningsbekräftelse - ${params.courseDetails.title}`,
      html: htmlContent,
      bcc: emailConfig.bccEmail || undefined
    };
    
    // Create transporter and send email
    const transporter = await createTransporter();
    
    // If no transporter could be created
    if (!transporter) {
      console.log('Failed to create email transporter, simulating email instead');
      return {
        success: true,
        message: 'Email simulated (transporter creation failed)'
      };
    }
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Booking confirmation email sent:', info.messageId);
    
    // If using Ethereal, log the URL where the email can be viewed
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      try {
        // Check if this is an Ethereal email account (test account)
        if (info.envelope && info.envelope.from && 
            typeof info.envelope.from === 'string' && 
            info.envelope.from.includes('ethereal.email')) {
          // @ts-ignore - typingsfel i nodemailer mellan olika versioner
          const testUrl = nodemailer.getTestMessageUrl(info);
          if (testUrl) {
            console.log('📧 CONFIRMATION EMAIL VIEW URL: ' + testUrl);
          }
        } else {
          console.log('📧 Real email sent, no preview URL available');
        }
      } catch (error) {
        console.log('📧 Unable to get test message URL:', error);
      }
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
    console.log('📧 GIFT CARD: Starting email preparation process');
    console.log(`📧 GIFT CARD: Preparing to send gift card email to: ${params.giftCardData.recipient_email}`);
    console.log(`📧 GIFT CARD: Code: ${params.giftCardData.code}, Amount: ${params.giftCardData.amount}`);
    console.log(`📧 GIFT CARD: Sender: ${params.senderInfo.name}, Recipient: ${params.giftCardData.recipient_name}`);
    console.log(`📧 GIFT CARD: PDF Attached: ${params.pdfBuffer ? 'Yes' : 'No'}`);
    
    // Format the expiry date
    const expiryDate = new Date(params.giftCardData.expires_at).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    console.log(`📧 GIFT CARD: Formatted expiry date: ${expiryDate}`);
    
    // Create HTML email content
    console.log('📧 GIFT CARD: Generating HTML email content');
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #547264;">Presentkort från Studio Clay</h2>
        <p>Hej ${params.giftCardData.recipient_name},</p>
        <p>Du har fått ett presentkort från ${params.senderInfo.name}!</p>
        
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Presentkortsinformation</h3>
          <p><strong>Kod:</strong> ${params.giftCardData.code}</p>
          <p><strong>Värde:</strong> ${params.giftCardData.amount} kr</p>
          <p><strong>Giltig till:</strong> ${expiryDate}</p>
        </div>
        
        ${params.giftCardData.message ? `
        <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #547264;">Personligt meddelande</h3>
          <p>${params.giftCardData.message}</p>
        </div>
        ` : ''}
        
        <p>Presentkortet finns bifogat som PDF. Du kan använda presentkortet både online på vår hemsida och i vår studio.</p>
        <p>Om du har några frågor, vänligen kontakta oss på <a href="mailto:eva@studioclay.se">eva@studioclay.se</a> eller ring 079-312 06 05.</p>
        <p>Vänliga hälsningar,<br>Studio Clay</p>
      </div>
    `;
    
    // Create email options
    console.log('📧 GIFT CARD: Setting up email options');
    const mailOptions = {
      from: emailConfig.studioClayEmail,
      to: params.giftCardData.recipient_email,
      subject: `Presentkort från Studio Clay - ${params.giftCardData.amount} kr`,
      html: htmlContent,
      bcc: emailConfig.bccEmail || undefined,
      attachments: params.pdfBuffer ? [
        {
          filename: `Presentkort-${params.giftCardData.code}.pdf`,
          content: params.pdfBuffer,
          contentType: 'application/pdf'
        }
      ] : undefined
    };
    
    console.log(`📧 GIFT CARD: Email options prepared: From ${mailOptions.from}, To: ${mailOptions.to}`);
    console.log(`📧 GIFT CARD: BCC: ${mailOptions.bcc || 'None'}, Attachments: ${mailOptions.attachments ? 'Yes' : 'No'}`);
    
    // Create transporter and send email
    console.log('📧 GIFT CARD: Creating email transporter');
    const transporter = await createTransporter();
    
    // If no transporter could be created
    if (!transporter) {
      console.log('📧 GIFT CARD: Failed to create email transporter, simulating gift card email instead');
      return {
        success: true,
        message: 'Gift card email simulated (transporter creation failed)'
      };
    }
    
    // Send the email
    console.log('📧 GIFT CARD: Sending email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`📧 GIFT CARD: Email sent successfully with message ID: ${info.messageId}`);
    console.log(`📧 GIFT CARD: Response: ${JSON.stringify(info.response)}`);
    
    // If using Ethereal, log the URL where the email can be viewed
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      try {
        // Check if this is an Ethereal email account (test account)
        if (info.envelope && info.envelope.from && 
            typeof info.envelope.from === 'string' && 
            info.envelope.from.includes('ethereal.email')) {
          // @ts-ignore - typingsfel i nodemailer mellan olika versioner
          const testUrl = nodemailer.getTestMessageUrl(info);
          if (testUrl) {
            console.log('📧 GIFT CARD EMAIL VIEW URL: ' + testUrl);
          }
        } else {
          console.log('📧 Real email sent, no preview URL available');
        }
      } catch (error) {
        console.log('📧 Unable to get test message URL:', error);
      }
    }
    
    return {
      success: true,
      message: 'Gift card email sent successfully'
    };
  } catch (error) {
    console.error(`📧 GIFT CARD ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Error details:', error);
    logSMTPError(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending gift card email'
    };
  }
} 