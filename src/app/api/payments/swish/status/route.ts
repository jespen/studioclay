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
    // Konfigurera certifikat i produktionsmiljö
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SWISH_TEST_MODE !== 'true') {
      logDebug('Setting up Swish certificates from environment variables in status endpoint');
      const certSetupResult = setupCertificate();
      
      if (!certSetupResult.success) {
        logError('Failed to set up Swish certificates in status endpoint:', certSetupResult);
      }
    }
    
    const url = new URL(request.url);
    const reference = url.searchParams.get('reference');
    
    if (!reference) {
      return NextResponse.json({
        success: false,
        error: 'Missing payment reference'
      }, { status: 400 });
    }
    
    // Logga anrop för felsökning
    logDebug('Checking payment status for reference:', reference);
    
    // Hämta betalningsinformation från databasen
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', reference)
      .single();
    
    if (error) {
      logError('Error fetching payment:', error);
      
      // Om vi inte hittar betalning i databasen, kanske den inte har kommit tillbaka från Swish än
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          message: 'Payment not found in database yet',
          status: 'PENDING',
          reference: reference,
          note: 'This payment might be new or still processing. Check again in a few seconds.'
        });
      }
      
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    if (!payment) {
      return NextResponse.json({
        success: true,
        message: 'Payment not found',
        status: 'UNKNOWN',
        reference: reference
      });
    }
    
    // Returnera status och information om betalningen
    return NextResponse.json({
      success: true,
      message: 'Payment status retrieved',
      payment: {
        reference: payment.payment_reference,
        status: payment.status,
        amount: payment.amount,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        method: payment.payment_method
      },
      // Instruktioner baserade på status
      next_steps: getNextStepsForStatus(payment.status)
    });
    
  } catch (error) {
    logError('Error checking payment status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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