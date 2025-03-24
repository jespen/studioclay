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
    
    // First try to find the booking using a simple query
    let { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', identifier)
      .single();
    
    console.log('Booking search by ID result:', { booking, error: bookingError?.message });

    // If not found by ID, try to find by invoice number
    if (bookingError || !booking) {
      console.log('Booking not found by ID, trying invoice number');
      const { data: bookingByInvoice, error: invoiceError } = await supabase
        .from('bookings')
        .select('*')
        .eq('invoice_number', identifier)
        .single();
      
      console.log('Booking search by invoice number result:', { booking: bookingByInvoice, error: invoiceError?.message });

      if (invoiceError || !bookingByInvoice) {
        console.log('Booking not found by invoice number either');
        return NextResponse.json(
          { success: false, error: 'Booking not found' },
          { status: 404 }
        );
      }

      booking = bookingByInvoice;
    }

    // Log the invoice number we're going to look for
    console.log('Found booking, invoice number:', booking.invoice_number);

    // Get the invoice PDF from storage
    console.log('Fetching PDF from storage');
    const { data: pdfData, error: pdfError } = await supabase
      .storage
      .from('invoices')
      .download(`${booking.invoice_number}.pdf`);

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
      invoiceNumber: booking.invoice_number
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
} 