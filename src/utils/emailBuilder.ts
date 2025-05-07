import { 
  generateEmailWrapper, 
  generateHeader, 
  generateConfirmationMessage,
  generateSection,
  generateCourseDetails,
  generateProductDetails,
  generateGiftCardDetails,
  generatePaymentDetails,
  generateReferenceSection,
  generateFooter
} from '@/utils/emailTemplates';

import { UserInfo, PaymentDetails } from '@/types/booking';

/**
 * Build a dynamic confirmation email based on product type and payment method
 */
export function buildConfirmationEmail(params: {
  productType: 'course' | 'gift_card' | 'product';
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    numberOfParticipants?: string | number;
  };
  paymentDetails: {
    method: string;
    status: string;
    reference?: string;
    invoiceNumber?: string;
    amount: number;
  };
  itemDetails: {
    id: string;
    title: string;
    description?: string;
    price: number;
    quantity?: number;
    start_date?: string;
    location?: string;
    code?: string;
    recipient_name?: string;
    recipient_email?: string;
    expires_at?: string;
  };
  reference: string;
}): string {
  // Create content parts
  const parts: string[] = [];
  
  // Add header with appropriate title
  let title = 'Orderbekräftelse';
  if (params.productType === 'course') {
    title = 'Bokningsbekräftelse';
  } else if (params.productType === 'gift_card') {
    title = 'Presentkortsbekräftelse';
  }
  
  parts.push(generateHeader(params.userInfo.firstName, title));
  
  // Add confirmation message
  parts.push(generateConfirmationMessage(params.productType));
  
  // Add appropriate details section based on product type
  if (params.productType === 'course') {
    // Format the course date
    const courseDate = params.itemDetails.start_date 
      ? new Date(params.itemDetails.start_date).toLocaleDateString('sv-SE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Stockholm'
        })
      : 'Ej angivet';
    
    // Calculate total price
    const numParticipants = parseInt(params.userInfo.numberOfParticipants?.toString() || '1');
    const unitPrice = params.itemDetails.price || 0;
    const totalPrice = numParticipants * unitPrice;
    
    const courseDetails = generateCourseDetails({
      title: params.itemDetails.title,
      date: courseDate,
      location: params.itemDetails.location,
      participants: numParticipants,
      unitPrice: unitPrice,
      totalPrice: totalPrice
    });
    
    parts.push(generateSection('Kursdetaljer', courseDetails));
  } 
  else if (params.productType === 'product') {
    const productDetails = generateProductDetails({
      title: params.itemDetails.title,
      price: params.itemDetails.price,
      quantity: params.itemDetails.quantity || 1,
      totalPrice: (params.itemDetails.quantity || 1) * params.itemDetails.price
    });
    
    parts.push(generateSection('Orderdetaljer', productDetails));
  } 
  else if (params.productType === 'gift_card') {
    // Format purchase date
    let purchaseDate = 'Idag';
    const currentDate = new Date().toISOString();
    
    try {
      purchaseDate = new Date(currentDate).toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Stockholm'
      });
    } catch (e) {
      console.error('Error formatting purchase date:', e);
    }
    
    const giftCardDetails = generateGiftCardDetails({
      code: params.itemDetails.code || '',
      amount: params.itemDetails.price,
      recipient: params.itemDetails.recipient_name,
      purchaseDate: purchaseDate
    });
    
    parts.push(generateSection('Presentkortsdetaljer', giftCardDetails));
  }
  
  // Add payment section only if payment details exist
  // For Swish, it's already paid; for invoice, show payment information
  if (params.paymentDetails && params.paymentDetails.method) {
    // Calculate due date for invoice (10 days from now)
    let dueDate = undefined;
    if (params.paymentDetails.method.toLowerCase() === 'invoice') {
      const date = new Date();
      date.setDate(date.getDate() + 10);
      dueDate = date.toLocaleDateString('sv-SE'); // Swedish format: YYYY-MM-DD
    }
    
    const paymentDetails = generatePaymentDetails({
      method: params.paymentDetails.method,
      status: params.paymentDetails.status,
      reference: params.paymentDetails.reference,
      invoiceNumber: params.paymentDetails.invoiceNumber,
      dueDate: dueDate,
      amount: params.paymentDetails.amount || params.itemDetails.price,
      customerName: `${params.userInfo.firstName} ${params.userInfo.lastName}`
    });
    
    // If it's an invoice, call it "Fakturainformation", otherwise "Betalningsinformation"
    const paymentTitle = params.paymentDetails.method.toLowerCase() === 'invoice' 
      ? 'Fakturainformation' 
      : 'Betalningsinformation';
      
    parts.push(generateSection(paymentTitle, paymentDetails));
  }
  
  // Add reference section
  parts.push(generateReferenceSection(params.reference));
  
  // Add footer
  parts.push(generateFooter());
  
  // Combine all parts and wrap in the main template
  return generateEmailWrapper(parts.join('\n'));
} 