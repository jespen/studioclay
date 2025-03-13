import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

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

    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(25);
    doc.text('STUDIO CLAY', 105, 30, { align: 'center' });
    doc.setFontSize(18);
    doc.text('PRESENTKORT', 105, 40, { align: 'center' });

    // Add a decorative border
    doc.setLineWidth(2);
    doc.rect(20, 50, 170, 200);
    doc.stroke();

    // Gift card details
    doc.setFontSize(14);
    doc.text(`Kod: ${code}`, 30, 70);
    
    doc.setFontSize(16);
    doc.text(`Värde: ${amount} SEK`, 30, 90);

    // Recipient and sender info
    doc.setFontSize(12);
    doc.text(`Till: ${recipient_name}`, 30, 120);
    doc.text(`Från: ${sender_name}`, 30, 130);

    // Expiration date
    const expiryDate = new Date(expires_at).toLocaleDateString('sv-SE');
    doc.text(`Giltigt till: ${expiryDate}`, 30, 150);

    // Add message if available
    if (message) {
      doc.text('Meddelande:', 30, 170);
      const splitMessage = doc.splitTextToSize(message, 150);
      doc.text(splitMessage, 30, 180);
    }

    // Footer with terms
    doc.setFontSize(10);
    doc.text('Villkor:', 30, 220);
    doc.setFontSize(8);
    const terms = 'Detta presentkort kan användas för alla tjänster hos Studio Clay. Presentkortet kan inte bytas mot kontanter och är giltigt till och med det angivna utgångsdatumet.';
    const splitTerms = doc.splitTextToSize(terms, 170);
    doc.text(splitTerms, 30, 230);

    // Get the PDF as a buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
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