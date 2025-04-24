import nodemailer from 'nodemailer';
import { createEmailTransporter, logSMTPError } from '@/lib/email';

/**
 * Sends an email using the configured email transporter
 * @param {Object} options - Email options (from, to, subject, text, html, attachments)
 * @returns {Promise<Object>} - Success status and message
 */
export async function sendEmail(options) {
  try {
    console.log('📧 Sending server email...');
    
    // For Office 365, the from address MUST match exactly the authenticated user
    // Get the authenticated email address from environment variables
    const authenticatedEmail = process.env.EMAIL_USER;
    
    // Office 365 often rejects complex from values, so simplify it
    // to just the raw email address that matches the authenticated user
    options.from = authenticatedEmail;
    
    console.log('📧 Using from address:', options.from);
    
    const transporter = await createEmailTransporter();
    
    if (!transporter) {
      console.log('📧 No transporter available, simulating email send');
      console.log('📧 Would send email to:', options.to);
      console.log('📧 With subject:', options.subject);
      
      // In development mode, return success
      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          message: 'Email simulated in development environment'
        };
      }
      
      return {
        success: false,
        message: 'Email transporter not available'
      };
    }
    
    // Send the email
    const info = await transporter.sendMail({
      from: options.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc || process.env.BCC_EMAIL,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments
    });
    
    console.log('📧 Email sent successfully:', info.messageId);
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending server email:', error);
    logSMTPError(error);
    
    return {
      success: false,
      message: error.message || 'Unknown error sending email'
    };
  }
}

/**
 * Konvertera UTC-tid till svensk tid
 * @param {string} isoDate - ISO-formaterad datum/tid-sträng
 * @returns {string} Formaterad datum/tid-sträng i svensk format
 */
function formatSwedishDateTime(isoDate) {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: 'Europe/Stockholm'
  }).format(new Date(isoDate));
}

// Använd denna funktion konsekvent i all kod som visar datum/tid 