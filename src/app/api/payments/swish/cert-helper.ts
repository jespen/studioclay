import fs from 'fs';
import path from 'path';
import os from 'os';
import { logDebug, logError } from '@/lib/logging';

/**
 * Hjälpfunktion för att skapa certifikatfil från base64-kodad miljövariabel
 * Används i Vercel serverless miljö där vi inte kan inkludera certifikatfiler i deployments
 */
export function setupCertificate() {
  try {
    // Skapa temporär katalog
    const tempDir = path.join(os.tmpdir(), 'swish-certs');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Skapa certifikatfil från base64
    const bundlePath = path.join(tempDir, 'swish_bundle.pem');
    
    if (!process.env.SWISH_BUNDLE_BASE64) {
      logError('Missing SWISH_BUNDLE_BASE64 environment variable');
      return { 
        success: false, 
        error: 'Missing SWISH_BUNDLE_BASE64 environment variable',
        tempDir
      };
    }
    
    // Konvertera base64 till buffer och skriv till fil
    const certBuffer = Buffer.from(process.env.SWISH_BUNDLE_BASE64, 'base64');
    fs.writeFileSync(bundlePath, certBuffer);
    
    // Verifiera att filen skapades korrekt
    if (!fs.existsSync(bundlePath)) {
      return { 
        success: false, 
        error: 'Failed to create certificate file',
        tempDir
      };
    }
    
    // Uppdatera miljövariabler för att peka på tempfilen
    process.env.SWISH_PROD_CERT_PATH = bundlePath;
    process.env.SWISH_PROD_KEY_PATH = bundlePath;
    process.env.SWISH_PROD_CA_PATH = bundlePath;
    
    const fileStats = fs.statSync(bundlePath);
    
    logDebug('Successfully set up Swish certificate:', {
      path: bundlePath,
      size: fileStats.size,
      mode: fileStats.mode.toString(8),
      created: fileStats.birthtime
    });
    
    return { 
      success: true,
      certPath: bundlePath,
      exists: true,
      size: fileStats.size,
      permissions: fileStats.mode.toString(8),
      tempDir
    };
  } catch (error) {
    logError('Error setting up certificate:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    };
  }
} 