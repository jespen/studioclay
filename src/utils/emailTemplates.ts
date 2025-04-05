/**
 * Email template system for Studio Clay
 * 
 * This file contains modular email templates that can be combined
 * to create different types of confirmation emails.
 */

/**
 * Generate the main email wrapper
 */
export const generateEmailWrapper = (content: string): string => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      ${content}
    </div>
  `;
};

/**
 * Generate header with greeting
 */
export const generateHeader = (name: string, title: string): string => {
  return `
    <h2 style="color: #547264;">${title}</h2>
    <p>Hej ${name},</p>
  `;
};

/**
 * Generate a confirmation message based on product type
 */
export const generateConfirmationMessage = (productType: 'course' | 'gift_card' | 'product'): string => {
  switch (productType) {
    case 'course':
      return '<p>Tack för din bokning hos Studio Clay! Din plats är nu reserverad.</p>';
    case 'gift_card':
      return '<p>Tack för din beställning av presentkort, i mailet hittar du presentkortet.</p>';
    case 'product':
      return '<p>Tack för din beställning hos Studio Clay!</p>';
    default:
      return '<p>Tack för ditt köp hos Studio Clay!</p>';
  }
};

/**
 * Generate a section wrapper
 */
export const generateSection = (title: string, content: string): string => {
  return `
    <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #547264;">${title}</h3>
      ${content}
    </div>
  `;
};

/**
 * Generate course details section
 */
export const generateCourseDetails = (courseData: {
  title: string;
  date: string;
  location?: string;
  participants: number;
  unitPrice: number;
  totalPrice: number;
}): string => {
  return `
    <p><strong>Kurs:</strong> ${courseData.title}</p>
    <p><strong>Datum:</strong> ${courseData.date}</p>
    ${courseData.location ? `<p><strong>Plats:</strong> ${courseData.location}</p>` : ''}
    <p><strong>Antal deltagare:</strong> ${courseData.participants}</p>
    <p><strong>Pris per deltagare:</strong> ${courseData.unitPrice.toFixed(2)} kr</p>
    <p><strong>Totalt pris:</strong> ${courseData.totalPrice.toFixed(2)} kr</p>
  `;
};

/**
 * Generate product details section
 */
export const generateProductDetails = (productData: {
  title: string;
  price: number;
  quantity: number;
  totalPrice: number;
}): string => {
  return `
    <p><strong>Produkt:</strong> ${productData.title}</p>
    <p><strong>Antal:</strong> ${productData.quantity}</p>
    <p><strong>Pris per styck:</strong> ${productData.price.toFixed(2)} kr</p>
    <p><strong>Totalt pris:</strong> ${productData.totalPrice.toFixed(2)} kr</p>
  `;
};

/**
 * Generate gift card details section
 */
export const generateGiftCardDetails = (giftCardData: {
  code: string;
  amount: number;
  recipient?: string;
  purchaseDate: string;
}): string => {
  return `
    <p><strong>Typ:</strong> Presentkort</p>
    <p><strong>Inköpsdatum:</strong> ${giftCardData.purchaseDate}</p>
    <p><strong>Pris:</strong> ${giftCardData.amount.toFixed(2)} kr</p>
    <p><strong>Presentkortskod:</strong> ${giftCardData.code}</p>
    ${giftCardData.recipient ? `<p><strong>Till:</strong> ${giftCardData.recipient}</p>` : ''}
  `;
};

/**
 * Generate payment details section based on payment method
 */
export const generatePaymentDetails = (paymentData: {
  method: string;
  status: string;
  reference?: string;
  invoiceNumber?: string;
  dueDate?: string;
  amount: number;
  customerName?: string;
}): string => {
  let methodText = '';
  let detailText = '';

  switch (paymentData.method.toLowerCase()) {
    case 'swish':
      methodText = 'Swish';
      detailText = paymentData.reference 
        ? `<p>Betalning genomförd med Swish. Betalningsreferens: ${paymentData.reference}</p>`
        : '<p>Betalning genomförd med Swish.</p>';
      break;
      
    case 'invoice':
      methodText = 'Faktura';
      
      const invoiceInfo = paymentData.invoiceNumber 
        ? `<p><strong>Fakturanummer:</strong> ${paymentData.invoiceNumber}</p>` 
        : '';
        
      const dueDateInfo = paymentData.dueDate 
        ? `<p><strong>Förfallodatum:</strong> ${paymentData.dueDate}</p>`
        : '';
        
      detailText = `
        ${invoiceInfo}
        ${dueDateInfo}
        <p><strong>Att betala:</strong> ${paymentData.amount.toFixed(2)} kr</p>
        <p>Vänligen betala fakturan inom 10 dagar till vårt bankgiro: 5938-4560.</p>
        ${paymentData.customerName 
          ? `<p>Ange ditt namn (${paymentData.customerName}) som referens vid betalning.</p>`
          : '<p>Ange ditt namn som referens vid betalning.</p>'
        }
      `;
      break;
      
    default:
      methodText = paymentData.method || 'Direktbetalning';
      detailText = '<p>Betalningsinformation har registrerats.</p>';
  }

  return `
    <p><strong>Betalningsmetod:</strong> ${methodText}</p>
    ${detailText}
  `;
};

/**
 * Generate reference number section
 */
export const generateReferenceSection = (reference: string): string => {
  return `<p>Din referens: <strong>${reference}</strong></p>`;
};

/**
 * Generate footer with contact information
 */
export const generateFooter = (): string => {
  return `
    <p>Om du har några frågor, vänligen kontakta oss på <a href="mailto:eva@studioclay.se">eva@studioclay.se</a> eller ring 079-312 06 05.</p>
    <p>Vänliga hälsningar,<br>Studio Clay</p>
  `;
}; 