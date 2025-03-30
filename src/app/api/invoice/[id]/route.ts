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
    console.log('Fetching invoice for id:', params.id);
    const identifier = params.id;
    
    // Variable to hold the invoice number, regardless of the source
    let invoiceNumber = null;
    
    // First try to find the booking using a simple query in bookings table
    let { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', identifier)
      .single();
    
    console.log('Booking search by ID result:', { booking, error: bookingError?.message });

    // If not found by ID, try to find by invoice number in bookings
    if (bookingError || !booking) {
      console.log('Booking not found by ID, trying invoice number in bookings table');
      const { data: bookingByInvoice, error: invoiceError } = await supabase
        .from('bookings')
        .select('*')
        .eq('invoice_number', identifier)
        .single();
      
      console.log('Booking search by invoice number result:', { booking: bookingByInvoice, error: invoiceError?.message });

      if (bookingByInvoice) {
        booking = bookingByInvoice;
        invoiceNumber = booking.invoice_number;
        console.log('Found booking with invoice number:', invoiceNumber);
      } else {
        console.log('Booking not found by invoice number either, trying art_orders table');
        
        // Try to find in art_orders table by ID
        let { data: artOrder, error: artOrderError } = await supabase
          .from('art_orders')
          .select('*')
          .eq('id', identifier)
          .single();
        
        console.log('Art order search by ID result:', { artOrder, error: artOrderError?.message });
        
        // If not found by ID, try by invoice number
        if (artOrderError || !artOrder) {
          console.log('Art order not found by ID, trying invoice number');
          const { data: artOrderByInvoice, error: artInvoiceError } = await supabase
            .from('art_orders')
            .select('*')
            .eq('invoice_number', identifier)
            .single();
          
          console.log('Art order search by invoice number result:', { artOrder: artOrderByInvoice, error: artInvoiceError?.message });
          
          if (artOrderByInvoice) {
            artOrder = artOrderByInvoice;
            invoiceNumber = artOrder.invoice_number;
            console.log('Found art order with invoice number:', invoiceNumber);
          } else {
            console.log('Invoice number not found in any table');
            return NextResponse.json(
              { success: false, error: 'Invoice not found' },
              { status: 404 }
            );
          }
        } else {
          invoiceNumber = artOrder.invoice_number;
        }
      }
    } else {
      invoiceNumber = booking.invoice_number;
    }
    
    // If we couldn't find an invoice number, return an error
    if (!invoiceNumber) {
      return NextResponse.json(
        { success: false, error: 'Invoice number not found' },
        { status: 404 }
      );
    }

    // Log the invoice number we're going to look for
    console.log('Found invoice number:', invoiceNumber);

    // Get the invoice PDF from storage
    console.log('Fetching PDF from storage');
    const { data: pdfData, error: pdfError } = await supabase
      .storage
      .from('invoices')
      .download(`${invoiceNumber}.pdf`);

    console.log('PDF fetch result:', { success: !!pdfData, error: pdfError?.message });

    if (pdfError || !pdfData) {
      return NextResponse.json(
        { success: false, error: 'Invoice PDF not found' },
        { status: 404 }
      );
    }

    // Convert the PDF data to base64
    const base64Pdf = await pdfData.arrayBuffer();
    const base64String = Buffer.from(base64Pdf).toString('base64');

    console.log('Successfully fetched and converted PDF');
    return NextResponse.json({
      success: true,
      pdf: base64String,
      invoiceNumber: invoiceNumber
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
} 