import fs from 'fs';
import path from 'path';
import https from 'https';
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { logDebug } from '@/lib/logging';

export async function POST(request: Request) {
  try {
    const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    
    // Create HTTPS agent
    const agent = new https.Agent({
      cert: fs.readFileSync(path.resolve(process.cwd(), isTestMode ? process.env.SWISH_TEST_CERT_PATH! : process.env.SWISH_PROD_CERT_PATH!)),
      key: fs.readFileSync(path.resolve(process.cwd(), isTestMode ? process.env.SWISH_TEST_KEY_PATH! : process.env.SWISH_PROD_KEY_PATH!)),
      ca: fs.readFileSync(path.resolve(process.cwd(), isTestMode ? process.env.SWISH_TEST_CA_PATH! : process.env.SWISH_PROD_CA_PATH!)),
      rejectUnauthorized: !isTestMode,
      minVersion: 'TLSv1.2'
    });

    // Create a minimal test payment
    const paymentData = {
      payeePaymentReference: uuidv4(),
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/swish/callback`,
      payeeAlias: isTestMode ? process.env.SWISH_TEST_PAYEE_ALIAS! : process.env.SWISH_PROD_PAYEE_ALIAS!,
      amount: "1.00",
      currency: "SEK",
      message: "Test payment",
      payerAlias: "46739000001" // Test number for successful payment
    };

    // URLs to try
    const urls = [
      'https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests'
    ];

    const results = [];

    // Try both URLs
    for (const url of urls) {
      try {
        logDebug(`Testing payment at URL: ${url}`);
        logDebug('Payment data:', paymentData);
        
        const response = await fetch(url, {
          method: 'POST',
          agent,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(paymentData),
          timeout: 10000
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData
        });

        logDebug(`Response from ${url}:`, {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });

        // If we get a successful response, no need to try the other URL
        if (response.ok) {
          break;
        }
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
      paymentData,
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