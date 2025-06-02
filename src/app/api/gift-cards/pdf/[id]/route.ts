/**
 * DEDIKERAD GIFT CARD PDF ENDPOINT - /api/gift-cards/pdf/[id]
 * 
 * Denna endpoint hanterar specifikt presentkorts-PDFs:
 * - Söker endast i gift_cards tabellen
 * - Hämtar PDFs endast från 'giftcards' bucket i Supabase Storage
 * - Stöder sökning via payment_reference, code eller gift card ID
 * 
 * SEPARATION OF CONCERNS:
 * - /api/invoice/[id] → Hanterar faktura-PDFs från 'invoices' bucket
 * - /api/gift-cards/pdf/[id] → Hanterar presentkorts-PDFs från 'giftcards' bucket
 * 
 * STATUS: Aktiv endpoint för admin-gränssnittet
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Fetching gift card PDF for identifier:', params.id);
    const identifier = params.id;
    
    let giftCardData = null;
    let pdfFileName = null;
    
    // Steg 1: Försök hitta gift card via ID
    const { data: giftCardById, error: idError } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', identifier)
      .maybeSingle();
    
    if (giftCardById) {
      giftCardData = giftCardById;
      console.log('Found gift card by ID:', giftCardData.id);
    } else {
      // Steg 2: Försök hitta via payment_reference
      const { data: giftCardByRef, error: refError } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('payment_reference', identifier)
        .maybeSingle();
      
      if (giftCardByRef) {
        giftCardData = giftCardByRef;
        console.log('Found gift card by payment_reference:', giftCardData.payment_reference);
      } else {
        // Steg 3: Försök hitta via code
        const { data: giftCardByCode, error: codeError } = await supabase
          .from('gift_cards')
          .select('*')
          .eq('code', identifier)
          .maybeSingle();
        
        if (giftCardByCode) {
          giftCardData = giftCardByCode;
          console.log('Found gift card by code:', giftCardData.code);
        } else {
          // Steg 4: Sista försök - hitta via invoice_number
          const { data: giftCardByInvoice, error: invoiceError } = await supabase
            .from('gift_cards')
            .select('*')
            .eq('invoice_number', identifier)
            .maybeSingle();
          
          if (giftCardByInvoice) {
            giftCardData = giftCardByInvoice;
            console.log('Found gift card by invoice_number:', giftCardData.invoice_number);
          }
        }
      }
    }
    
    if (!giftCardData) {
      console.log('Gift card not found with identifier:', identifier);
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      );
    }
    
    // Bestäm filnamn för PDF baserat på payment_reference eller code
    // Presentkorts-PDFs sparas med payment_reference som primary, code som fallback
    if (giftCardData.payment_reference) {
      pdfFileName = `${giftCardData.payment_reference.replace(/[^a-zA-Z0-9-_.]/g, '_')}.pdf`;
      console.log('Using payment_reference for PDF filename:', pdfFileName);
    } else if (giftCardData.code) {
      pdfFileName = `${giftCardData.code.replace(/[^a-zA-Z0-9-_.]/g, '_')}.pdf`;
      console.log('Using code for PDF filename:', pdfFileName);
    } else {
      console.log('No payment_reference or code found for gift card');
      return NextResponse.json(
        { success: false, error: 'Cannot determine PDF filename - no payment_reference or code' },
        { status: 400 }
      );
    }
    
    console.log('Fetching gift card PDF from giftcards bucket:', pdfFileName);
    
    // Hämta PDF från giftcards bucket
    const { data: pdfData, error: pdfError } = await supabase
      .storage
      .from('giftcards')
      .download(pdfFileName);
    
    console.log('Gift card PDF fetch result:', { 
      success: !!pdfData, 
      error: pdfError?.message,
      fileName: pdfFileName 
    });
    
    if (pdfError || !pdfData) {
      console.log('Gift card PDF not found in storage:', pdfError?.message);
      return NextResponse.json(
        { success: false, error: 'Gift card PDF not found in storage' },
        { status: 404 }
      );
    }
    
    // Konvertera PDF-data till base64
    const base64Pdf = await pdfData.arrayBuffer();
    const base64String = Buffer.from(base64Pdf).toString('base64');
    
    console.log('Successfully fetched and converted gift card PDF');
    return NextResponse.json({
      success: true,
      pdf: base64String,
      giftCardCode: giftCardData.code,
      paymentReference: giftCardData.payment_reference
    });
    
  } catch (error) {
    console.error('Error fetching gift card PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gift card PDF' },
      { status: 500 }
    );
  }
} 