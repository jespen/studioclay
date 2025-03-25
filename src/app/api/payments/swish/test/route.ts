import fs from 'fs';
import path from 'path';
import https from 'https';
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { logDebug } from '@/lib/logging';

export async function GET() {
  try {
    const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    
    // Load certificates
    const certPath = isTestMode ? process.env.SWISH_TEST_CERT_PATH! : process.env.SWISH_PROD_CERT_PATH!;
    const keyPath = isTestMode ? process.env.SWISH_TEST_KEY_PATH! : process.env.SWISH_PROD_KEY_PATH!;
    const caPath = isTestMode ? process.env.SWISH_TEST_CA_PATH! : process.env.SWISH_PROD_CA_PATH!;

    // Create HTTPS agent
    const agent = new https.Agent({
      cert: fs.readFileSync(path.resolve(process.cwd(), certPath)),
      key: fs.readFileSync(path.resolve(process.cwd(), keyPath)),
      ca: fs.readFileSync(path.resolve(process.cwd(), caPath)),
      rejectUnauthorized: !isTestMode,
      minVersion: 'TLSv1.2'
    });

    // Test URLs to try
    const urls = [
      'https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests'
    ];

    const results = [];

    // Try both URLs
    for (const url of urls) {
      try {
        logDebug(`Testing URL: ${url}`);
        
        const response = await fetch(url, {
          method: 'HEAD', // Just check if we can reach the endpoint
          agent,
          headers: {
            'Accept': 'application/json'
          },
          timeout: 5000
        });

        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        logDebug(`Response from ${url}:`, {
          status: response.status,
          statusText: response.statusText
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          url,
          error: errorMessage
        });
        logDebug(`Error testing ${url}:`, error);
      }
    }

    // Return test results
    return NextResponse.json({
      success: true,
      testMode: isTestMode,
      certInfo: {
        certPath,
        keyPath,
        caPath,
        certExists: fs.existsSync(path.resolve(process.cwd(), certPath)),
        keyExists: fs.existsSync(path.resolve(process.cwd(), keyPath)),
        caExists: fs.existsSync(path.resolve(process.cwd(), caPath))
      },
      results
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
} 