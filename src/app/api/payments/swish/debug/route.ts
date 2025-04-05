import { NextRequest, NextResponse } from 'next/server';
import { SwishService } from '@/services/swish/swishService';
import { logDebug, logError } from '@/lib/logging';
import { formatSwishPhoneNumber } from '@/utils/swish/phoneNumberFormatter';
import fs from 'fs';
import path from 'path';

/**
 * Temporär testendpoint för att direkt testa Swish API-integrationen
 * och felsöka certifikatproblem.
 * 
 * OBS: DENNA ENDPOINT MÅSTE TAS BORT INNAN SLUTLIG DRIFTSÄTTNING!
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const phoneNumber = url.searchParams.get('phone') || '0701234567';
    const amount = url.searchParams.get('amount') || '1';
    const reference = `DEBUG-${Date.now()}`;
    
    // Logga all miljöinformation
    const environmentInfo = {
      test_mode: process.env.NEXT_PUBLIC_SWISH_TEST_MODE,
      node_env: process.env.NODE_ENV,
      base_url: process.env.NEXT_PUBLIC_BASE_URL,
      test_api_url: process.env.SWISH_TEST_API_URL,
      prod_api_url: process.env.SWISH_PROD_API_URL,
      test_cert_path: process.env.SWISH_TEST_CERT_PATH,
      test_cert_exists: process.env.SWISH_TEST_CERT_PATH ? 
        fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_TEST_CERT_PATH)) : false,
      prod_cert_path: process.env.SWISH_PROD_CERT_PATH,
      prod_cert_exists: process.env.SWISH_PROD_CERT_PATH ? 
        fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_PROD_CERT_PATH)) : false
    };
    
    logDebug('Swish debug endpoint environment info:', environmentInfo);
    
    // Förbered callback-URL
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    const callbackUrl = baseUrl.replace('http:', 'https:') + '/api/payments/swish/callback';
    
    logDebug('Initiating Swish debug payment', {
      phoneNumber,
      amount,
      reference,
      callbackUrl
    });
    
    // Hämta Swish-tjänsten
    const swishService = SwishService.getInstance();
    
    // Kontrollera certifikat och miljö
    try {
      const certInfo = {
        certPath: swishService.getCertPath(),
        keyPath: swishService.getKeyPath(),
        caPath: swishService.getCaPath(),
        isTestMode: swishService.isTestMode()
      };
      
      logDebug('Swish certificate info:', certInfo);
    } catch (certError) {
      logError('Error getting certificate paths:', certError);
    }
    
    // Testa formattering av telefonnummer
    try {
      const formattedPhone = formatSwishPhoneNumber(phoneNumber);
      logDebug('Phone number formatting test:', {
        input: phoneNumber,
        formatted: formattedPhone
      });
    } catch (phoneError) {
      logError('Phone number formatting error:', phoneError);
    }
    
    // Förbered betalningsdata
    const paymentData = {
      payeePaymentReference: reference,
      callbackUrl: callbackUrl,
      payeeAlias: swishService.getPayeeAlias(),
      amount: amount,
      currency: "SEK",
      message: `Debug-betalning ${reference}`,
      payerAlias: formatSwishPhoneNumber(phoneNumber)
    };
    
    logDebug('Sending debug payment to Swish API', {
      ...paymentData,
      payerAlias: formatSwishPhoneNumber(phoneNumber).substring(0, 4) + '****' + formatSwishPhoneNumber(phoneNumber).slice(-2)
    });
    
    // Anropa Swish API
    const result = await swishService.createPayment(paymentData);
    
    logDebug('Swish debug payment result', result);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Debug payment initiated successfully',
        reference: result.data?.reference,
        environment: environmentInfo,
        data: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Debug payment failed',
        error: result.error,
        environment: environmentInfo,
        data: result
      }, { status: 400 });
    }
  } catch (error) {
    logError('Error in Swish debug endpoint', error);
    
    return NextResponse.json({
      success: false,
      message: 'Debug payment processing error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 