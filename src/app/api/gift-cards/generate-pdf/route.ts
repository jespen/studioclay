import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      code, 
      amount, 
      sender_name, 
      recipient_name, 
      expires_at, 
      message 
    } = body;
    
    if (!id || !code || !amount || !sender_name || !recipient_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[API] Generating PDF for gift card:', id);

    // Create a PDF document with built-in font settings
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Gift Card - ${code}`,
        Author: 'Studio Clay',
      }
    });
    
    // Collect PDF data chunks
    let chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    // End PDF and return the data
    let completeCallback: Function;
    const completePromise = new Promise((resolve) => {
      completeCallback = resolve;
    });
    
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      completeCallback(pdfBuffer);
    });
    
    // Add content to PDF
    await generateGiftCardPDF(doc, {
      id, code, amount, sender_name, recipient_name, expires_at, message
    });
    
    // End the document and wait for the buffer
    doc.end();
    const pdfBuffer = await completePromise as Buffer;
    
    console.log('[API] PDF generated successfully for gift card:', id);
    
    // Return the PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="giftcard-${code}.pdf"`,
      },
    });
    
  } catch (err: any) {
    console.error('[API] PDF generation error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred generating the PDF' },
      { status: 500 }
    );
  }
}

interface GiftCardData {
  id: string;
  code: string;
  amount: number;
  sender_name: string;
  recipient_name: string;
  expires_at: string;
  message?: string;
}

// Simple PDF generator that doesn't use custom fonts
async function generateGiftCardPDF(doc: PDFKit.PDFDocument, giftCard: GiftCardData) {
  // Add title - using default fonts
  doc.fontSize(25);
  doc.text('STUDIO CLAY', { align: 'center' } as any);
  doc.fontSize(18);
  doc.text('PRESENTKORT', { align: 'center' } as any);
  doc.moveDown(1);
  
  // Add a decorative border
  doc.lineWidth(2);
  doc.rect(50, 160, doc.page.width - 100, doc.page.height - 300);
  doc.stroke();
  
  // Gift card details
  doc.fontSize(14);
  doc.text(`Kod: ${giftCard.code}`, 70, 190);
  
  doc.fontSize(16);
  doc.text(`Värde: ${giftCard.amount} SEK`, 70, 220);
  
  // Recipient and sender info
  doc.fontSize(12);
  doc.text(`Till: ${giftCard.recipient_name}`, 70, 260);
  doc.text(`Från: ${giftCard.sender_name}`, 70, 280);
  doc.moveDown(1);
  
  // Expiration date
  const expiryDate = new Date(giftCard.expires_at).toLocaleDateString('sv-SE');
  doc.text(`Giltigt till: ${expiryDate}`, 70, 320);
  
  // Add message if available
  if (giftCard.message) {
    doc.moveDown(1);
    doc.text('Meddelande:', 70);
    doc.text(giftCard.message, {
      width: doc.page.width - 140,
      align: 'left'
    } as any);
  }
  
  // Footer with terms
  const footerY = doc.page.height - 120;
  doc.fontSize(10);
  doc.text('Villkor:', 70, footerY);
  doc.fontSize(8);
  doc.text('Detta presentkort kan användas för alla tjänster hos Studio Clay. Presentkortet kan inte bytas mot kontanter och är giltigt till och med det angivna utgångsdatumet.', {
    width: doc.page.width - 140
  } as any);
  
  return doc;
} 