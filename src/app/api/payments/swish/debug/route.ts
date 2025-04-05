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
    
    // Samla all miljöinformation
    const environmentInfo = {
      test_mode: process.env.NEXT_PUBLIC_SWISH_TEST_MODE,
      node_env: process.env.NODE_ENV,
      base_url: process.env.NEXT_PUBLIC_BASE_URL,
      test_api_url: process.env.SWISH_TEST_API_URL,
      prod_api_url: process.env.SWISH_PROD_API_URL,
      test_payee_alias: process.env.SWISH_TEST_PAYEE_ALIAS,
      prod_payee_alias: process.env.SWISH_PROD_PAYEE_ALIAS
    };
    
    // Kontrollera om certifikatfilerna finns
    const certCheckResults = {
      test_cert_path: process.env.SWISH_TEST_CERT_PATH,
      test_cert_exists: process.env.SWISH_TEST_CERT_PATH ? 
        fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_TEST_CERT_PATH)) : false,
      test_key_path: process.env.SWISH_TEST_KEY_PATH,
      test_key_exists: process.env.SWISH_TEST_KEY_PATH ? 
        fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_TEST_KEY_PATH)) : false,
      test_ca_path: process.env.SWISH_TEST_CA_PATH,
      test_ca_exists: process.env.SWISH_TEST_CA_PATH ? 
        fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_TEST_CA_PATH)) : false,
      prod_cert_path: process.env.SWISH_PROD_CERT_PATH,
      prod_cert_exists: process.env.SWISH_PROD_CERT_PATH ? 
        fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_PROD_CERT_PATH)) : false,
      prod_key_path: process.env.SWISH_PROD_KEY_PATH,
      prod_key_exists: process.env.SWISH_PROD_KEY_PATH ? 
        fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_PROD_KEY_PATH)) : false,
      prod_ca_path: process.env.SWISH_PROD_CA_PATH,
      prod_ca_exists: process.env.SWISH_PROD_CA_PATH ? 
        fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_PROD_CA_PATH)) : false
    };
    
    logDebug('Swish debug endpoint environment info:', environmentInfo);
    logDebug('Swish certificate files check:', certCheckResults);
    
    // Försök att initiera Swish-tjänsten och fånga eventuella fel
    let swishServiceInfo = {};
    let swishError = null;
    
    try {
      const swishService = SwishService.getInstance();
      
      swishServiceInfo = {
        payeeAlias: swishService.getPayeeAlias(),
        certPath: swishService.getCertPath(),
        keyPath: swishService.getKeyPath(),
        caPath: swishService.getCaPath(),
        isTestMode: swishService.isTestMode(),
        service_initialized: true
      };
      
      // Kontrollera certifikatfiler som SwishService använder
      const certChecks = {
        certExists: fs.existsSync(path.resolve(process.cwd(), swishService.getCertPath())),
        keyExists: fs.existsSync(path.resolve(process.cwd(), swishService.getKeyPath())),
        caExists: fs.existsSync(path.resolve(process.cwd(), swishService.getCaPath()))
      };
      
      swishServiceInfo = { ...swishServiceInfo, certChecks };
      
    } catch (error) {
      swishError = error instanceof Error 
        ? { message: error.message, stack: error.stack, name: error.name }
        : { message: 'Unknown error' };
      
      swishServiceInfo = {
        service_initialized: false,
        error: swishError
      };
      
      logError('Error initializing SwishService:', error);
    }
    
    // Om vi kunde skapa tjänsten, testa formatering av telefonnummer
    let phoneFormatting = {};
    
    if (swishServiceInfo.service_initialized) {
      try {
        const swishService = SwishService.getInstance();
        const formattedPhone = swishService.formatPhoneNumber(phoneNumber);
        
        phoneFormatting = {
          success: true,
          original: phoneNumber,
          formatted: formattedPhone
        };
      } catch (phoneError) {
        phoneFormatting = {
          success: false,
          error: phoneError instanceof Error ? phoneError.message : 'Unknown phone formatting error'
        };
        
        logError('Phone number formatting error:', phoneError);
      }
    }
    
    // Förbered respons med all felsökningsinformation
    return NextResponse.json({
      success: !swishError,
      message: swishError ? 'Error initializing Swish service' : 'Swish debug info',
      request_info: {
        url: request.url,
        params: {
          phone: phoneNumber,
          amount: amount
        },
        reference: reference
      },
      environment: environmentInfo,
      certificate_files: certCheckResults,
      swish_service: swishServiceInfo,
      phone_formatting: phoneFormatting,
      cwd: process.cwd(),
      error: swishError
    }, { status: swishError ? 500 : 200 });
    
  } catch (error) {
    logError('Uncaught error in Swish debug endpoint', error);
    
    return NextResponse.json({
      success: false,
      message: 'Debug endpoint error',
      error: error instanceof Error ? 
        { 
          message: error.message,
          name: error.name,
          stack: error.stack
        } : 'Unknown error',
      cwd: process.cwd()
    }, { status: 500 });
  }
} 