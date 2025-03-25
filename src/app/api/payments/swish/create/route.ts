import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logDebug, logError } from '@/lib/logging';
import https from 'https';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { SwishService } from '@/services/swish/swishService';
import { SwishPaymentData } from '@/services/swish/types';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Schema för validering av Swish-betalningsdata
const SwishPaymentSchema = z.object({
  phone_number: z.string().min(1),
  payment_method: z.literal('swish'),
  product_type: z.literal('course'),
  product_id: z.string(),
  amount: z.number(),
  quantity: z.number(),
  user_info: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    numberOfParticipants: z.string()
  })
});

// Hjälpfunktion för att kontrollera idempotency
async function checkIdempotency(idempotencyKey: string) {
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('*')
    .eq('metadata->idempotency_key', idempotencyKey)
    .single();

  return existingPayment;
}

// Helper function to make HTTPS request with certificates
async function makeSwishRequest(data: any): Promise<{ success: boolean, data?: any, error?: string }> {
  try {
    const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    const baseUrl = isTestMode 
      ? 'https://mss.cpc.getswish.net'
      : 'https://cpc.getswish.net';
    const endpoint = '/swish-cpcapi/api/v1/paymentrequests';
    const url = `${baseUrl}${endpoint}`;

    // Load certificates
    const certPath = isTestMode ? process.env.SWISH_TEST_CERT_PATH! : process.env.SWISH_PROD_CERT_PATH!;
    const keyPath = isTestMode ? process.env.SWISH_TEST_KEY_PATH! : process.env.SWISH_PROD_KEY_PATH!;
    const caPath = isTestMode ? process.env.SWISH_TEST_CA_PATH! : process.env.SWISH_PROD_CA_PATH!;

    // Log certificate paths and check if they exist
    logDebug('Certificate paths:', {
      certPath: path.resolve(process.cwd(), certPath),
      keyPath: path.resolve(process.cwd(), keyPath),
      caPath: path.resolve(process.cwd(), caPath)
    });

    // Create HTTPS agent with certificates
    const agent = new https.Agent({
      cert: fs.readFileSync(path.resolve(process.cwd(), certPath)),
      key: fs.readFileSync(path.resolve(process.cwd(), keyPath)),
      ca: fs.readFileSync(path.resolve(process.cwd(), caPath)),
      minVersion: 'TLSv1.2'
    });

    // Make the request using node-fetch
    const response = await fetch(url, {
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    // Handle response
    if (response.status === 201) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('No Location header in response');
      }
      const reference = location.split('/').pop();
      return { success: true, data: { reference } };
    }

    // If not 201, try to get error details
    const responseText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = responseText;
    }

    logDebug('Swish API error response:', {
      status: response.status,
      statusText: response.statusText,
      data: errorData
    });

    return {
      success: false,
      error: `Swish API error: ${response.status} ${response.statusText}`,
      data: errorData
    };
  } catch (error) {
    logDebug('Error in makeSwishRequest:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Lägg till en GET-metod för att testa att routen fungerar
export async function GET(request: Request) {
  try {
    // Verifiera Supabase-konfiguration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

    // Verifiera certifikatfiler
    const certPath = process.env.SWISH_TEST_CERT_PATH || '';
    const resolvedCertPath = path.resolve(process.cwd(), certPath);
    const certExists = fs.existsSync(resolvedCertPath);

    return NextResponse.json({ 
      status: 'ok', 
      message: 'Swish payment endpoint is working',
      timestamp: new Date().toISOString(),
      env: {
        test_mode: process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true',
        base_url: process.env.NEXT_PUBLIC_BASE_URL,
        cert_exists: certExists,
        has_supabase_config: hasSupabaseConfig
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      status: 'error',
      message: 'Failed to check configuration',
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = SwishPaymentSchema.parse(body);
    const { phone_number, product_id, user_info, amount } = validatedData;

    // Generate payment reference (max 35 chars, alphanumeric)
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const paymentReference = `SC-${timestamp}-${randomNum}`;

    // Create payment record in database first
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_method: 'swish',
        amount: amount,
        currency: 'SEK',
        payment_reference: paymentReference,
        product_type: 'course',
        product_id: product_id,
        status: 'CREATED',
        user_info: user_info,
        phone_number: phone_number,
        metadata: {
          idempotency_key: request.headers.get('Idempotency-Key')
        }
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    // Ensure callback URL uses HTTPS
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const callbackUrl = baseUrl.replace('http://', 'https://') + '/api/payments/swish/callback';

    // Use SwishService to create payment
    const swishService = SwishService.getInstance();
    const result = await swishService.createPayment({
      payeePaymentReference: paymentReference,
      callbackUrl: callbackUrl,
      payeeAlias: swishService.getPayeeAlias(),
      amount: amount.toFixed(2),
      currency: "SEK",
      message: `Betalning för ${product_id}`.substring(0, 50), // Max 50 chars
      payerAlias: swishService.formatPhoneNumber(phone_number)
    });

    if (!result.success) {
      // If Swish request fails, update payment status to ERROR
      await supabase
        .from('payments')
        .update({ 
          status: 'ERROR',
          metadata: {
            ...payment.metadata,
            swish_error: result.error
          }
        })
        .eq('payment_reference', paymentReference);

      return NextResponse.json({
        success: false,
        error: result.error,
        details: result.data
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        reference: paymentReference
      }
    });
  } catch (error) {
    logDebug('Error in POST handler:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 