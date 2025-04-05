import { NextRequest, NextResponse } from 'next/server';
import { SwishService } from '@/services/swish/swishService';
import { logDebug, logError } from '@/lib/logging';
import fs from 'fs';
import path from 'path';

/**
 * Testendpoint för att testa hela Swish-BankID flödet
 * Denna endpoint är endast för testsyften och ska tas bort innan produktion
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const phoneNumber = url.searchParams.get('phone') || '0707616231';
    const amount = url.searchParams.get('amount') || '1';
    
    // Generera ett unikt referensnummer för denna testtransaktion
    const reference = `TEST-${Date.now()}`;
    
    // Samla miljöinformation för felsökning
    const environment = {
      test_mode: process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true' ? 'Ja' : 'Nej (PRODUKTION)',
      base_url: process.env.NEXT_PUBLIC_BASE_URL,
      node_env: process.env.NODE_ENV
    };
    
    // Initiera Swish-tjänsten
    const swishService = SwishService.getInstance();
    
    // Kontrollera om tjänsten initierades korrekt
    if (!swishService) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize Swish service',
        environment
      }, { status: 500 });
    }
    
    // Formatera telefonnumret till Swish-format (46XXXXXXXX)
    const formattedPhone = swishService.formatPhoneNumber(phoneNumber);
    
    // Skapa en callback-URL för att ta emot uppdateringar från Swish
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const callbackUrl = baseUrl + '/api/payments/swish/callback';
    
    // Skapa betalningsdata
    const paymentData = {
      payeePaymentReference: reference,
      callbackUrl: callbackUrl,
      payeeAlias: swishService.getPayeeAlias(),
      amount: amount,
      currency: "SEK",
      message: `Testbetalning via testflow`,
      payerAlias: formattedPhone
    };
    
    // Logga betalningsinformation (med dold telefonnummer)
    logDebug('Test payment request:', {
      ...paymentData,
      payerAlias: `${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`
    });
    
    // Skicka betalningsförfrågan till Swish API
    const result = await swishService.createPayment(paymentData);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Unknown error creating payment',
        stage: 'payment_creation',
        environment
      }, { status: 400 });
    }
    
    // Returnera ett svar med instruktioner för användaren
    return NextResponse.json({
      success: true,
      message: 'Swish payment initiated',
      environment,
      warning: environment.test_mode === 'Nej (PRODUKTION)' 
        ? 'OBS! Du använder PRODUKTIONSMILJÖN. En riktig betalning kommer att genomföras.' 
        : undefined,
      instructions: 'Open your Swish app to approve the payment and authenticate with BankID',
      merchant_number: swishService.getPayeeAlias(),
      payment_reference: reference,
      payment_id: result.data?.reference || reference,
      phone: formattedPhone,
      amount: amount,
      next_steps: [
        "1. Öppna Swish-appen på din telefon",
        "2. Du bör se en betalningsförfrågan på 1 kr",
        "3. Godkänn betalningen",
        "4. BankID kommer att öppnas för autentisering",
        "5. När betalningen är klar kommer Swish att skicka en callback till vår server"
      ],
      check_status_url: `${baseUrl}/api/payments/swish/status?reference=${reference}`,
      callback_url: callbackUrl
    });
    
  } catch (error) {
    logError('Error in Swish test flow:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        test_mode: process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true' ? 'Ja' : 'Nej (PRODUKTION)',
        base_url: process.env.NEXT_PUBLIC_BASE_URL,
        node_env: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
} 