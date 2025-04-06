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
  senderEmail?: string;
  senderPhone?: string;
  createdAt?: string;
  expiresAt?: string;
  expiryDate?: string; // Alternativt format för utgångsdatum, redan formaterat som string
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
  
  // Add company logo and header - centered
  doc.setFontSize(28);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  // Using the same style for STUDIO CLAY but with space and centered
  doc.setFont('helvetica', 'normal');
  doc.text('STUDIO CLAY', pageWidth / 2, margin + 10, { align: 'center' });
  
  // Add presentkort title
  doc.setFontSize(32);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('PRESENTKORT', pageWidth / 2, margin + 25, { align: 'center' });
  
  // Add gift card code - less space
  doc.setFontSize(16);
  doc.setTextColor(50, 50, 50);
  doc.text(`Kod: ${giftCardData.code}`, pageWidth / 2, margin + 32, { align: 'center' });
  
  // Add gift card amount (make it stand out) - moved up slightly
  doc.setFontSize(42);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${giftCardData.amount} kr`, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
  
  // Add validity information
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  
  const createdDate = new Date(giftCardData.createdAt);
  const expiresDate = new Date(giftCardData.expiresAt);
  
  doc.text(`Giltigt från: ${formatDate(createdDate)}`, pageWidth / 2, pageHeight / 2 - 5, { align: 'center' });
  doc.text(`Giltigt till: ${formatDate(expiresDate)}`, pageWidth / 2, pageHeight / 2 + 5, { align: 'center' });
  
  // 1. Add recipient information - centered
  if (giftCardData.recipientName) {
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(`Till: ${giftCardData.recipientName}`, pageWidth / 2, pageHeight / 2 + 25, { align: 'center' });
  }
  
  // 2. Add personal message if available - right after recipient name
  if (giftCardData.message) {
    // Create a box for the message
    doc.setFillColor(245, 245, 245);
    const messageBoxY = pageHeight / 2 + 35;
    doc.roundedRect(margin + 20, messageBoxY, contentWidth - 40, 40, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'italic');
    
    // Wrap the message text to fit within the box
    const splitMessage = doc.splitTextToSize(giftCardData.message, contentWidth - 60);
    doc.text(splitMessage, pageWidth / 2, messageBoxY + 15, { align: 'center' });
  }
  
  // 3. Add sender information - centered
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(`Från: ${giftCardData.senderName}`, pageWidth / 2, pageHeight / 2 + 85, { align: 'center' });
  
  // Add instructions - moved down so the message is clearly visible
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text([
    'Detta presentkort kan användas som betalning för kurser och produkter hos Studio Clay.',
    'För att lösa in presentkortet, ange koden vid betalning på vår hemsida eller i butiken.'
  ], pageWidth / 2, pageHeight - 35, { align: 'center' });
  
  // Add footer with contact information - moved down to just above the border
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text([
    `${COMPANY_INFO.name} | ${COMPANY_INFO.address}, ${COMPANY_INFO.postalCode} ${COMPANY_INFO.city}`,
    `Tel: ${COMPANY_INFO.phone} | E-post: ${COMPANY_INFO.email} | ${COMPANY_INFO.website}`
  ], pageWidth / 2, pageHeight - 15, { align: 'center' });
  
  // Add decorative elements (border moved closer to the edge)
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20); // Reduced margin for border
  
  // Return the PDF as a blob
  return doc.output('blob');
} 