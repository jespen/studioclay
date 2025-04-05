import { NextRequest, NextResponse } from 'next/server';
import { logDebug, logError } from '@/lib/logging';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

/**
 * En enkel testroute för att visa alla miljövariabler och certifikat utan
 * att använda SwishConfig-klassen som validering.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    // Schema för Swish-miljövariabler som vi testar mot, men utan url() validering
    const schema = z.object({
      /** Whether to use Swish test environment (MSS) */
      NEXT_PUBLIC_SWISH_TEST_MODE: z.string().optional(),
      /** Swish number for the merchant in test environment */
      SWISH_TEST_PAYEE_ALIAS: z.string().optional(),
      /** Path to the Swish certificate file in test environment */
      SWISH_TEST_CERT_PATH: z.string().optional(),
      /** Path to the Swish private key file in test environment */
      SWISH_TEST_KEY_PATH: z.string().optional(),
      /** Path to the Swish CA certificate file in test environment */
      SWISH_TEST_CA_PATH: z.string().optional(),
      /** Base URL for the application (used for callback URLs) */
      NEXT_PUBLIC_BASE_URL: z.string().optional(),
      /** Swish number for the merchant in production environment */
      SWISH_PROD_PAYEE_ALIAS: z.string().optional(),
      /** Path to the Swish certificate file in production environment */
      SWISH_PROD_CERT_PATH: z.string().optional(),
      /** Path to the Swish private key file in production environment */
      SWISH_PROD_KEY_PATH: z.string().optional(),
      /** Path to the Swish CA certificate file in production environment */
      SWISH_PROD_CA_PATH: z.string().optional(),
    });
    
    // Validera miljövariabler men tillåt alla
    const result = schema.safeParse(process.env);
    
    // Kontrollera certifikatfilerna
    const certStatusMap = {
      test: {
        cert: process.env.SWISH_TEST_CERT_PATH ? {
          path: process.env.SWISH_TEST_CERT_PATH,
          exists: fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_TEST_CERT_PATH || '')),
          readable: false,
          content: ''
        } : null,
        key: process.env.SWISH_TEST_KEY_PATH ? {
          path: process.env.SWISH_TEST_KEY_PATH,
          exists: fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_TEST_KEY_PATH || '')),
          readable: false,
          content: ''
        } : null,
        ca: process.env.SWISH_TEST_CA_PATH ? {
          path: process.env.SWISH_TEST_CA_PATH,
          exists: fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_TEST_CA_PATH || '')),
          readable: false,
          content: ''
        } : null
      },
      prod: {
        cert: process.env.SWISH_PROD_CERT_PATH ? {
          path: process.env.SWISH_PROD_CERT_PATH,
          exists: fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_PROD_CERT_PATH || '')),
          readable: false,
          content: ''
        } : null,
        key: process.env.SWISH_PROD_KEY_PATH ? {
          path: process.env.SWISH_PROD_KEY_PATH,
          exists: fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_PROD_KEY_PATH || '')),
          readable: false,
          content: ''
        } : null,
        ca: process.env.SWISH_PROD_CA_PATH ? {
          path: process.env.SWISH_PROD_CA_PATH,
          exists: fs.existsSync(path.resolve(process.cwd(), process.env.SWISH_PROD_CA_PATH || '')),
          readable: false,
          content: ''
        } : null
      }
    };
    
    // Testa om filerna kan läsas
    try {
      if (certStatusMap.test.cert && certStatusMap.test.cert.exists) {
        const content = fs.readFileSync(path.resolve(process.cwd(), process.env.SWISH_TEST_CERT_PATH || ''), 'utf8');
        certStatusMap.test.cert.readable = true;
        certStatusMap.test.cert.content = content.substring(0, 50) + '...';
      }
      
      if (certStatusMap.test.key && certStatusMap.test.key.exists) {
        const content = fs.readFileSync(path.resolve(process.cwd(), process.env.SWISH_TEST_KEY_PATH || ''), 'utf8');
        certStatusMap.test.key.readable = true;
        certStatusMap.test.key.content = content.substring(0, 50) + '...';
      }
      
      if (certStatusMap.test.ca && certStatusMap.test.ca.exists) {
        const content = fs.readFileSync(path.resolve(process.cwd(), process.env.SWISH_TEST_CA_PATH || ''), 'utf8');
        certStatusMap.test.ca.readable = true;
        certStatusMap.test.ca.content = content.substring(0, 50) + '...';
      }
      
      // Liknande kontroller för produktionscertifikat
      if (certStatusMap.prod.cert && certStatusMap.prod.cert.exists) {
        const content = fs.readFileSync(path.resolve(process.cwd(), process.env.SWISH_PROD_CERT_PATH || ''), 'utf8');
        certStatusMap.prod.cert.readable = true;
        certStatusMap.prod.cert.content = content.substring(0, 50) + '...';
      }
    } catch (readError) {
      logError('Error reading certificate files:', readError);
    }
    
    // Samla alla miljövariabler
    const env = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SWISH_TEST_MODE: process.env.NEXT_PUBLIC_SWISH_TEST_MODE,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      SWISH_TEST_API_URL: process.env.SWISH_TEST_API_URL,
      SWISH_PROD_API_URL: process.env.SWISH_PROD_API_URL,
      SWISH_TEST_PAYEE_ALIAS: process.env.SWISH_TEST_PAYEE_ALIAS,
      SWISH_PROD_PAYEE_ALIAS: process.env.SWISH_PROD_PAYEE_ALIAS,
      SWISH_TEST_CERT_PATH: process.env.SWISH_TEST_CERT_PATH,
      SWISH_TEST_KEY_PATH: process.env.SWISH_TEST_KEY_PATH,
      SWISH_TEST_CA_PATH: process.env.SWISH_TEST_CA_PATH,
      SWISH_PROD_CERT_PATH: process.env.SWISH_PROD_CERT_PATH,
      SWISH_PROD_KEY_PATH: process.env.SWISH_PROD_KEY_PATH,
      SWISH_PROD_CA_PATH: process.env.SWISH_PROD_CA_PATH
    };
    
    return NextResponse.json({
      success: true,
      url_check: {
        provided: process.env.NEXT_PUBLIC_BASE_URL,
        is_valid_url: z.string().url().safeParse(process.env.NEXT_PUBLIC_BASE_URL).success
      },
      env_check: {
        success: result.success,
        data: result.success ? result.data : null,
        error: !result.success ? result.error : null
      },
      environment: env,
      certificate_files: certStatusMap,
      cwd: process.cwd()
    });
    
  } catch (error) {
    logError('Error in Swish quicktest endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : 'Unknown error',
      cwd: process.cwd()
    }, { status: 500 });
  }
} 