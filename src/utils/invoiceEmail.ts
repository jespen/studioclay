/**
 * DEPRECATED - DENNA FIL ANVÄNDS INTE LÄNGRE
 * 
 * Funktionaliteten har flyttats till src/utils/serverEmail.ts
 * Behåller tills vidare för referens, men kan tas bort.
 * 
 * Om du ser detta och applikationen fortfarande fungerar korrekt, 
 * är det säkert att ta bort denna fil.
 */

/*
import emailjs from '@emailjs/browser';
import { emailConfig } from '@/config/email';
import { UserInfo, PaymentDetails } from '@/types/booking';
import { generateInvoicePDF } from './invoicePDF';

// Initialize EmailJS - only needed for older versions
// emailjs.init(emailConfig.publicKey);

interface InvoiceEmailParams {
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
}

/**
 * Generates and sends an invoice email with attached PDF
 */
export async function sendInvoiceEmail(params: InvoiceEmailParams): Promise<{success: boolean; message: string}> {
  try {
    // In a server environment, we can't use browser APIs like FileReader
    // Since this is running server-side in an API route, we need a different approach
    
    console.log('Server-side email sending is currently in development');
    console.log('Email would be sent to:', params.userInfo.email);
    console.log('With invoice number:', params.invoiceNumber);
    
    // TODO: Use a server-compatible email service like Nodemailer or SendGrid instead
    // For now, we'll just pretend the email was sent successfully
    
    return {
      success: true,
      message: 'Invoice email simulated in development environment'
    };
    
    /* Original browser-based implementation:
    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
      console.error('EmailJS configuration is incomplete');
      return {
        success: false,
        message: 'Email configuration is missing'
      };
    }
    
    if (!params.userInfo || !params.paymentDetails || !params.courseDetails) {
      console.error('Missing required invoice data');
      return {
        success: false,
        message: 'Missing required invoice data'
      };
    }
    
    // Calculate due date (10 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    const formattedDueDate = dueDate.toLocaleDateString('sv-SE'); // Swedish format: YYYY-MM-DD
    
    // Generate PDF
    const invoiceData = {
      customerInfo: params.userInfo,
      courseDetails: params.courseDetails,
      invoiceDetails: params.paymentDetails.invoiceDetails || {
        address: '',
        postalCode: '',
        city: ''
      },
      invoiceNumber: params.invoiceNumber,
      dueDate: formattedDueDate
    };
    
    console.log('Generating invoice PDF for email...');
    const pdfBlob = await generateInvoicePDF(invoiceData);
    
    // Convert PDF blob to base64
    const base64Pdf = await blobToBase64(pdfBlob);
    
    // Set up EmailJS template parameters
    const templateParams = {
      to_name: `${params.userInfo.firstName} ${params.userInfo.lastName}`,
      to_email: params.userInfo.email,
      subject: `Faktura för ${params.courseDetails.title}`,
      message: `Tack för din bokning av kursen "${params.courseDetails.title}". Bifogat hittar du fakturan för din bokning. Vänligen betala inom 10 dagar.`,
      invoice_number: params.invoiceNumber,
      due_date: formattedDueDate,
      total_amount: (parseInt(params.userInfo.numberOfParticipants) * params.courseDetails.price).toFixed(2),
      pdf_attachment: base64Pdf,
      course_name: params.courseDetails.title,
      course_date: new Date(params.courseDetails.start_date).toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    
    console.log('Sending invoice email to:', params.userInfo.email);
    
    // Send the email
    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templateId,
      templateParams,
      emailConfig.publicKey
    );
    
    console.log('Email successfully sent:', response);
    return {
      success: true,
      message: 'Invoice email sent successfully'
    };
    */
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending invoice email'
    };
  }
}

/**
 * Helper function to convert a Blob to base64
 */
/*
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
*/ 