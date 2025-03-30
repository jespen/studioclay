import { UserInfo } from '@/types/booking';

// Company details
const COMPANY_INFO = {
  name: 'Studio Clay',
  address: 'Norrtullsgatan 65',
  postalCode: '113 45',
  city: 'Stockholm',
  email: 'eva@studioclay.se',
  phone: '079-312 06 05',
  website: 'www.studioclay.se',
  orgNr: '559393-4234',
  bankgiro: '5938-4560',
  vatNr: 'SE559393423401'
};

// Function to generate a Swish QR code URL
function generateSwishQRUrl(
  amount: number,
  message: string,
  paymentReference: string
): string {
  // The real Swish API would need proper parameters, this is a placeholder
  // Format: amount;message;recipient;editable
  const payeeName = encodeURIComponent(COMPANY_INFO.name);
  const encodedMessage = encodeURIComponent(`${message} - Ref: ${paymentReference}`);
  const payeeAccount = encodeURIComponent('1230000000'); // Placeholder - Studio Clay's Swish number
  const qrAmount = amount.toFixed(2);
  
  const qrData = `C${payeeAccount};${qrAmount};${encodedMessage};${payeeName};0`;
  
  // Use a QR code API to generate the image
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
  
  return qrApiUrl;
}

// Function to download an image from a URL and return it as base64
async function getImageAsBase64(url: string): Promise<string> {
  // In a server environment, we can't use FileReader
  // For now, return empty string instead of trying to fetch the image
  console.log('QR code generation skipped in server environment');
  return '';
  
  /* Original browser-based implementation:
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return '';
  }
  */
}

// Function to generate invoice PDF
export async function generateInvoicePDF(
  invoiceData: {
    customerInfo: UserInfo;
    courseDetails: {
      title: string;
      description?: string;
      start_date: string;
      location?: string;
      price: number;
    };
    invoiceDetails: {
      address: string;
      postalCode: string;
      city: string;
      reference?: string;
    };
    invoiceNumber: string;
    dueDate: string;
  }
): Promise<Blob> {
  // Dynamically import jsPDF (to avoid SSR issues)
  const { default: jsPDF } = await import('jspdf');
  
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Colors
  const primaryColor = [66, 133, 119]; // RGB for Studio Clay green
  
  // Add company logo
  // In a real implementation, you would add the company logo image here
  // For now, we'll just add text with improved styling
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDIO CLAY', margin, margin);
  
  // Add invoice title with improved styling
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('FAKTURA', pageWidth - margin, margin, { align: 'right' });
  
  // Add invoice number and date with improved styling
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fakturanummer: ${invoiceData.invoiceNumber}`, pageWidth - margin, margin + 10, { align: 'right' });
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString('sv-SE');
  doc.text(`Fakturadatum: ${formattedDate}`, pageWidth - margin, margin + 15, { align: 'right' });
  doc.text(`Förfallodatum: ${invoiceData.dueDate}`, pageWidth - margin, margin + 20, { align: 'right' });
  
  // Company information with improved styling
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text([
    COMPANY_INFO.address,
    `${COMPANY_INFO.postalCode} ${COMPANY_INFO.city}`,
    `Email: ${COMPANY_INFO.email}`,
    `Tel: ${COMPANY_INFO.phone}`,
    `Org.nr: ${COMPANY_INFO.orgNr}`,
    `Bankgiro: ${COMPANY_INFO.bankgiro}`
  ], margin, margin + 15);
  
  // Customer information with improved styling
  const customerY = margin + 45;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Fakturamottagare:', margin, customerY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text([
    `${invoiceData.customerInfo.firstName} ${invoiceData.customerInfo.lastName}`,
    invoiceData.invoiceDetails.address,
    `${invoiceData.invoiceDetails.postalCode} ${invoiceData.invoiceDetails.city}`,
    `Tel: ${invoiceData.customerInfo.phone}`,
    `Email: ${invoiceData.customerInfo.email}`
  ], margin, customerY + 7);
  
  // Additional reference if provided with improved styling
  if (invoiceData.invoiceDetails.reference) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Er referens: ${invoiceData.invoiceDetails.reference}`, margin, customerY + 35);
  }
  
  // Invoice items table with improved styling
  const tableY = customerY + 45;
  
  // Table headers with improved styling
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableY, contentWidth, 8, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Beskrivning', margin + 5, tableY + 5);
  doc.text('Antal', margin + 90, tableY + 5);
  doc.text('Pris', margin + 110, tableY + 5);
  doc.text('Moms', margin + 130, tableY + 5);
  doc.text('Summa', margin + 160, tableY + 5, { align: 'right' });
  
  // Table content with improved styling
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Course name and description with improved styling
  const numParticipants = parseInt(invoiceData.customerInfo.numberOfParticipants) || 1;
  const courseDate = new Date(invoiceData.courseDetails.start_date).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const courseLocation = invoiceData.courseDetails.location || '';
  
  const itemDescription = [
    invoiceData.courseDetails.title,
    `Datum: ${courseDate}`,
    courseLocation ? `Plats: ${courseLocation}` : ''
  ].filter(Boolean).join('\n');
  
  const itemY = tableY + 15;
  doc.text(doc.splitTextToSize(itemDescription, 80), margin + 5, itemY);
  
  doc.text(numParticipants.toString(), margin + 90, itemY);
  
  // Fix for price undefined error - add safety check
  const coursePrice = invoiceData.courseDetails.price || 0; // Default to 0 if undefined
  doc.text(`${coursePrice.toFixed(2)} kr`, margin + 110, itemY);
  doc.text('25%', margin + 130, itemY);
  
  const totalPrice = numParticipants * coursePrice;
  doc.text(`${totalPrice.toFixed(2)} kr`, margin + 160, itemY, { align: 'right' });
  
  // Separate VAT calculations (Sweden typically includes VAT)
  const vatAmount = totalPrice * 0.2; // 25% VAT = 20% of total
  const priceExcludingVat = totalPrice - vatAmount;
  
  // Add a line with improved styling
  const summaryY = itemY + 30;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, summaryY - 10, margin + contentWidth, summaryY - 10);
  
  // Total summary with improved styling
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Summa exkl. moms:', margin + 90, summaryY);
  doc.text(`${priceExcludingVat.toFixed(2)} kr`, margin + 160, summaryY, { align: 'right' });
  
  doc.text('Moms 25%:', margin + 90, summaryY + 7);
  doc.text(`${vatAmount.toFixed(2)} kr`, margin + 160, summaryY + 7, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.text('Att betala:', margin + 90, summaryY + 14);
  doc.text(`${totalPrice.toFixed(2)} kr`, margin + 160, summaryY + 14, { align: 'right' });
  
  // Payment information with improved styling
  const paymentY = summaryY + 30;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Betalningsinformation', margin, paymentY);
  doc.setFont('helvetica', 'normal');
  
  // Using the customer name as reference
  const customerFullName = `${invoiceData.customerInfo.firstName} ${invoiceData.customerInfo.lastName}`;
  
  doc.text([
    `Bankgiro: ${COMPANY_INFO.bankgiro}`,
    `Referens: ${customerFullName}`,
    `Förfallodatum: ${invoiceData.dueDate}`,
    `Summa att betala: ${totalPrice.toFixed(2)} kr`
  ], margin, paymentY + 7);
  
  // Add QR code for Swish payment
  try {
    const swishMessage = `Betalning för ${invoiceData.courseDetails.title}`;
    const qrCodeUrl = generateSwishQRUrl(totalPrice, swishMessage, invoiceData.invoiceNumber);
    const qrImageBase64 = await getImageAsBase64(qrCodeUrl);
    
    if (qrImageBase64) {
      // Add Swish payment info and QR code
      const qrY = paymentY + 35;
      doc.setFont('helvetica', 'bold');
      doc.text('Betala enkelt med Swish', pageWidth - margin - 50, qrY - 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.addImage(qrImageBase64, 'PNG', pageWidth - margin - 75, qrY, 50, 50);
    }
  } catch (error) {
    console.error('Failed to add QR code:', error);
  }
  
  // Add footer with improved styling
  const footerY = pageHeight - margin;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text([
    'Studio Clay - Norrtullsgatan 65, 113 45 Stockholm',
    `Org.nr: ${COMPANY_INFO.orgNr} | Moms.nr: ${COMPANY_INFO.vatNr}`,
    'www.studioclay.se'
  ], pageWidth / 2, footerY, { align: 'center' });
  
  // Return the PDF as a blob
  return doc.output('blob');
} 