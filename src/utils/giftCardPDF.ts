import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { logInfo, logError, logWarning as logWarn } from '@/lib/logging';

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
  amount: number;
  code?: string;
  payment_reference?: string;
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  createdAt?: Date;
  expiresAt?: Date;
  message?: string;
  senderEmail?: string;
  senderPhone?: string;
}

// Function to generate gift card PDF
export async function generateGiftCardPDF(giftCardData: GiftCardData): Promise<Blob | null> {
  try {
    // Log detailed input information
    logInfo(`🎁 GIFT CARD PDF GENERATOR - Starting PDF generation`, {
      hasCode: !!giftCardData.code,
      hasPaymentReference: !!giftCardData.payment_reference,
      amount: giftCardData.amount,
      code: giftCardData.code || '[MISSING]',
      payment_reference: giftCardData.payment_reference || '[MISSING]',
      recipientName: giftCardData.recipientName || '[MISSING]',
      recipientEmail: giftCardData.recipientEmail || '[MISSING]',
      senderName: giftCardData.senderName || '[MISSING]',
      hasCreatedAt: !!giftCardData.createdAt,
      hasExpiresAt: !!giftCardData.expiresAt,
      createdAtTimestamp: giftCardData.createdAt?.toISOString() || '[MISSING]',
      expiresAtTimestamp: giftCardData.expiresAt?.toISOString() || '[MISSING]'
    });

    // Determine which reference to use for the PDF
    const referenceToUse = giftCardData.payment_reference || giftCardData.code;
    if (!referenceToUse) {
      logError(`❌ GIFT CARD PDF GENERATOR - No reference found for PDF`, {
        hasCode: !!giftCardData.code,
        hasPaymentReference: !!giftCardData.payment_reference,
        callStack: new Error().stack
      });
      return null;
    }

    logInfo(`🔑 GIFT CARD PDF GENERATOR - Using reference in PDF`, {
      referenceType: giftCardData.payment_reference ? 'payment_reference' : 'code',
      reference: referenceToUse,
      referenceSource: giftCardData.payment_reference ? 
        'Using payment_reference' : 
        'Using code (payment_reference not available)',
      sourceData: {
        code: giftCardData.code,
        payment_reference: giftCardData.payment_reference
      }
    });

    // Create a new PDF document with the original beautiful layout
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
    
    // Add gift card reference - less space (using either code or payment_reference)
    doc.setFontSize(16);
    doc.setTextColor(50, 50, 50);
    doc.text(`Referens: ${referenceToUse}`, pageWidth / 2, margin + 32, { align: 'center' });
    logInfo(`📝 GIFT CARD PDF GENERATOR - Added reference to PDF`, {
      referenceType: giftCardData.payment_reference ? 'payment_reference' : 'code',
      referenceValue: referenceToUse
    });
    
    // Add gift card amount (make it stand out) - moved up slightly
    doc.setFontSize(42);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${giftCardData.amount} kr`, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
    
    // Add validity information
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    
    // Format dates for display
    let createdAtFormatted = '';
    let expiresAtFormatted = '';
    
    if (giftCardData.createdAt) {
      createdAtFormatted = formatDate(giftCardData.createdAt);
      logInfo(`📅 GIFT CARD PDF GENERATOR - Formatted creation date`, {
        original: giftCardData.createdAt.toISOString(),
        formatted: createdAtFormatted
      });
      doc.text(`Giltigt från: ${createdAtFormatted}`, pageWidth / 2, pageHeight / 2 - 5, { align: 'center' });
    }
    
    if (giftCardData.expiresAt) {
      expiresAtFormatted = formatDate(giftCardData.expiresAt);
      logInfo(`⏰ GIFT CARD PDF GENERATOR - Formatted expiration date`, {
        original: giftCardData.expiresAt.toISOString(),
        formatted: expiresAtFormatted
      });
      doc.text(`Giltigt till: ${expiresAtFormatted}`, pageWidth / 2, pageHeight / 2 + 5, { align: 'center' });
    }
    
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
    if (giftCardData.senderName) {
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(`Från: ${giftCardData.senderName}`, pageWidth / 2, pageHeight / 2 + 85, { align: 'center' });
    }
    
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

    // Return the PDF as a Blob
    const pdfBlob = doc.output('blob');
    logInfo(`✅ GIFT CARD PDF GENERATOR - Successfully generated PDF`, {
      blobSize: pdfBlob.size,
      blobType: pdfBlob.type,
      referenceUsed: referenceToUse
    });
    
    return pdfBlob;
  } catch (error) {
    logError(`💥 GIFT CARD PDF GENERATOR - Error generating PDF`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      giftCardData: {
        hasCode: !!giftCardData.code,
        hasPaymentReference: !!giftCardData.payment_reference,
        amount: giftCardData.amount,
      },
      callStack: new Error().stack
    });
    return null;
  }
} 