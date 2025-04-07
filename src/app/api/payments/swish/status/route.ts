import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logDebug, logError } from '@/lib/logging';
import { setupCertificate } from '../cert-helper';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Endpoint för att kontrollera status på en Swish-betalning
 * Denna är användbar för testning av flödet
 */
export async function GET(request: NextRequest) {
  try {
    const paymentReference = request.nextUrl.searchParams.get('paymentReference');
    
    if (!paymentReference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    // First try to find payment by payeePaymentReference
    let { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', paymentReference)
      .single();

    // If not found, try with swish_payment_id
    if (!payment && !error) {
      const { data: payment2, error: error2 } = await supabase
        .from('payments')
        .select('*')
        .eq('swish_payment_id', paymentReference)
        .single();
      
      payment = payment2;
      error = error2;
    }

    if (error) {
      console.error('Error fetching payment:', error);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check if there's a booking for this payment
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('payment_id', payment.id)
      .single();

    return NextResponse.json({
      status: payment.status,
      paymentId: payment.id,
      bookingId: booking?.id,
      bookingReference: booking?.reference,
      error: payment.error_message
    });

  } catch (error) {
    console.error('Error in status check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Hjälpfunktion för att ge användaren rätt instruktioner baserat på betalningens status
 */
function getNextStepsForStatus(status: string): string[] {
  switch (status) {
    case 'CREATED':
      return [
        "Betalningen har skapats men väntar på godkännande.",
        "Öppna Swish-appen på din telefon och godkänn betalningen."
      ];
    case 'PAID':
      return [
        "Betalningen har genomförts!",
        "Tack för din betalning, den har registrerats i vårt system."
      ];
    case 'ERROR':
      return [
        "Betalningen misslyckades.",
        "Kontrollera ditt Swish-konto och försök igen."
      ];
    case 'CANCELLED':
      return [
        "Betalningen har avbrutits.",
        "Du kan starta en ny betalning om du vill försöka igen."
      ];
    case 'PENDING':
    default:
      return [
        "Betalningen behandlas.",
        "Vänta några sekunder och kontrollera status igen."
      ];
  }
} 