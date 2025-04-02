import { jsPDF } from 'jspdf';

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

// Function to format a date to Swedish format
function formatDate(date: Date): string {
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Interface for gift card data
export interface GiftCardData {
  code: string;
  amount: number;
  recipientName: string;
  recipientEmail?: string;
  message?: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  createdAt: string;
  expiresAt: string;
}

// Function to generate gift card PDF
export async function generateGiftCardPDF(giftCardData: GiftCardData): Promise<Blob> {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
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
  const accentColor = [200, 162, 110]; // Studio Clay accent color
  
  // Add company logo and header
  doc.setFontSize(28);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDIO CLAY', margin, margin);
  
  // Add presentkort title
  doc.setFontSize(32);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('PRESENTKORT', pageWidth / 2, margin + 15, { align: 'center' });
  
  // Add gift card code
  doc.setFontSize(16);
  doc.setTextColor(50, 50, 50);
  doc.text(`Kod: ${giftCardData.code}`, pageWidth / 2, margin + 25, { align: 'center' });
  
  // Add gift card amount (make it stand out)
  doc.setFontSize(42);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${giftCardData.amount} kr`, pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });
  
  // Add validity information
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  
  const createdDate = new Date(giftCardData.createdAt);
  const expiresDate = new Date(giftCardData.expiresAt);
  
  doc.text(`Giltigt från: ${formatDate(createdDate)}`, pageWidth / 2, pageHeight / 2 + 5, { align: 'center' });
  doc.text(`Giltigt till: ${formatDate(expiresDate)}`, pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });
  
  // Add recipient information
  if (giftCardData.recipientName) {
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(`Till: ${giftCardData.recipientName}`, margin, pageHeight / 2 + 35);
    
    if (giftCardData.recipientEmail) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`E-post: ${giftCardData.recipientEmail}`, margin, pageHeight / 2 + 45);
    }
  }
  
  // Add sender information
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(`Från: ${giftCardData.senderName}`, margin, pageHeight / 2 + 60);
  
  // Add personal message if available
  if (giftCardData.message) {
    // Create a box for the message
    doc.setFillColor(245, 245, 245);
    const messageBoxY = pageHeight / 2 + 70;
    doc.roundedRect(margin, messageBoxY, contentWidth, 40, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'italic');
    
    // Wrap the message text to fit within the box
    const splitMessage = doc.splitTextToSize(giftCardData.message, contentWidth - 20);
    doc.text(splitMessage, margin + 10, messageBoxY + 15);
  }
  
  // Add instructions
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text([
    'Detta presentkort kan användas som betalning för kurser och produkter hos Studio Clay.',
    'För att lösa in presentkortet, ange koden vid betalning på vår hemsida eller i butiken.'
  ], pageWidth / 2, pageHeight - margin - 25, { align: 'center' });
  
  // Add footer with contact information
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text([
    `${COMPANY_INFO.name} | ${COMPANY_INFO.address}, ${COMPANY_INFO.postalCode} ${COMPANY_INFO.city}`,
    `Tel: ${COMPANY_INFO.phone} | E-post: ${COMPANY_INFO.email} | ${COMPANY_INFO.website}`
  ], pageWidth / 2, pageHeight - margin - 5, { align: 'center' });
  
  // Add decorative elements (a simple border around the page)
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1);
  doc.rect(margin - 5, margin - 5, pageWidth - 2 * (margin - 5), pageHeight - 2 * (margin - 5));
  
  // Return the PDF as a blob
  return doc.output('blob');
} 