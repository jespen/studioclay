/**
 * OBSOLETE FILE - This entire file is deprecated
 * 
 * This file is no longer used and is kept only for reference.
 * All email functionality has been moved to serverEmail.ts
 * and pdfGenerator.ts for centralized handling.
 * 
 * DO NOT USE FUNCTIONS FROM THIS FILE!
 */

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
 * DEPRECATED: Send invoice via email
 * 
 * This function is deprecated. Use sendServerInvoiceEmail from serverEmail.ts instead.
 */
// export async function sendInvoiceEmail(params: InvoiceEmailParams): Promise<{success: boolean; message: string}> {
//   console.warn('DEPRECATED: Using obsolete sendInvoiceEmail function. Use sendServerInvoiceEmail instead.');
//   return {
//     success: false,
//     message: 'This function is deprecated. Use sendServerInvoiceEmail from serverEmail.ts instead.'
//   };
  
  /* Original code removed for clarity
  try {
    // ...original code...
  } catch (error) {
    // ...original error handling...
  }
  */
}

/**
 * DEPRECATED: Helper function to convert a Blob to base64
 */
/*
function blobToBase64(blob: Blob): Promise<string> {
  // ...original code...
}
*/ 