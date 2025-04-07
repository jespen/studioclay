import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logDebug, logError } from '@/lib/logging';
import path from 'path';
import fs from 'fs';
import { SwishService } from '@/services/swish/swishService';
import { PAYMENT_STATUS } from '@/services/swish/types';
import { z } from 'zod';
import axios from 'axios';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Schema för query params
const QuerySchema = z.object({
  paymentReference: z.string().optional(),
  reference: z.string().optional(),
  status: z.enum(['PAID', 'DECLINED', 'ERROR']).default('PAID'),
  testCallback: z.enum(['true', 'false']).transform(v => v === 'true').optional()
}).transform(data => {
  // Om reference är angiven men inte paymentReference, använd reference-värdet
  if (!data.paymentReference && data.reference) {
    return { 
      ...data,
      paymentReference: data.reference 
    };
  }
  return data;
});

/**
 * Temporär testendpoint för att direkt testa Swish API-integrationen
 * och felsöka certifikatproblem.
 * 
 * OBS: DENNA ENDPOINT MÅSTE TAS BORT INNAN SLUTLIG DRIFTSÄTTNING!
 */

// Testa om en URL är nåbar från internet
async function testCallbackUrl(url: string) {
  try {
    logDebug('Testing callback URL accessibility:', url);
    
    // Försök göra en HTTP HEAD-förfrågan till callback-URL:en
    // Använd axios eftersom fetch inte har stöd för timeouts
    const response = await axios.head(url, {
      timeout: 5000, // 5 sekunder timeout
      validateStatus: () => true // Acceptera alla statuskoder
    });
    
    logDebug('Callback URL test result:', {
      status: response.status,
      headers: response.headers,
      url: url
    });
    
    return {
      success: response.status < 500, // Även 4xx är OK eftersom det betyder att URL:en är nåbar
      status: response.status,
      message: `URL is ${response.status < 500 ? 'reachable' : 'not reachable'}`
    };
  } catch (error: unknown) {
    logError('Error testing callback URL:', error);
    
    // Analysera felet för att ge mer användbar information
    let errorMessage = 'Unknown error';
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused - server might be down or blocking connections';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timed out - server might be unreachable or slow';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'DNS lookup failed - domain might not exist or DNS issues';
      } else {
        errorMessage = error.message || 'Network error';
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const paymentReference = searchParams.get('paymentReference');
    const statusParam = searchParams.get('status') || 'PAID';
    const testCallbackParam = searchParams.get('testCallback');
    
    // Validera parametrarna
    const params = QuerySchema.parse({
      paymentReference,
      status: statusParam as any,
      testCallback: testCallbackParam as any
    });
    
    // Om vi ska testa callback-URL:en men inte simulera en betalning
    if (params.testCallback === true && !params.paymentReference) {
      // Konstruera callback-URL:en på samma sätt som i create-endpointen
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      let callbackUrl = baseUrl;
      
      // Säkerställ att vi har https
      if (callbackUrl.startsWith('http:')) {
        callbackUrl = callbackUrl.replace('http://', 'https://');
      }
      
      // DNS-alias hantering
      if (process.env.NODE_ENV === 'production') {
        if (callbackUrl.includes('www.studioclay.se')) {
          callbackUrl = callbackUrl.replace('www.studioclay.se', 'studioclay.se');
        }
      }
      
      // Lägg till sökvägen till callback-endpointen
      const callbackPath = '/api/payments/swish/callback';
      if (callbackUrl.endsWith('/')) {
        callbackUrl = callbackUrl + callbackPath.substring(1);
      } else {
        callbackUrl = callbackUrl + callbackPath;
      }
      
      // Testa om callback-URL:en är nåbar
      const testResult = await testCallbackUrl(callbackUrl);
      
      return NextResponse.json({
        success: testResult.success,
        message: 'Callback URL test completed',
        callbackUrl: callbackUrl,
        testResult: testResult
      });
    }
    
    // Om inget referensnummer anges, returnera endast statusinformation
    if (!params.paymentReference) {
      return NextResponse.json({
        success: true,
        message: 'Swish debug endpoint',
        usage: 'Call with ?reference=YOUR_PAYMENT_REFERENCE&status=PAID to simulate a callback',
        callback_url: process.env.NEXT_PUBLIC_BASE_URL?.replace('http://', 'https://').replace('www.studioclay.se', 'studioclay.se') + '/api/payments/swish/callback'
      });
    }
    
    logDebug('DEBUG: Simulating Swish callback for reference:', params.paymentReference);
    
    // Hämta betalningsinformationen från databasen
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', params.paymentReference)
      .single();
      
    if (paymentError) {
      logError('DEBUG: Error fetching payment:', paymentError);
      return NextResponse.json({
        success: false,
        error: 'Payment not found',
        details: paymentError
      }, { status: 404 });
    }
    
    if (!payment) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }
    
    logDebug('DEBUG: Found payment:', payment);

    // Simulera ett callback från Swish genom att göra en POST-anrop till vår egen callback-endpoint
    const callbackData = {
      id: `M-${Date.now()}`,
      payeePaymentReference: payment.payment_reference,
      paymentReference: `P-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`,
      callbackUrl: process.env.NEXT_PUBLIC_BASE_URL + '/api/payments/swish/callback',
      payerAlias: payment.phone_number,
      payeeAlias: process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true' 
        ? (process.env.SWISH_TEST_PAYEE_ALIAS || '1231181189')
        : (process.env.SWISH_PROD_PAYEE_ALIAS || '1232296374'),
      amount: payment.amount.toString(),
      currency: payment.currency,
      message: 'Callback simulation',
      status: params.status,
      dateCreated: new Date().toISOString(),
      datePaid: new Date().toISOString(),
      errorCode: params.status === 'ERROR' ? 'RP07' : undefined,
      errorMessage: params.status === 'ERROR' ? 'Simulation of error' : undefined
    };
    
    logDebug('DEBUG: Sending simulated callback data:', callbackData);
    
    // Anropa callback-endpoint med simulerade data
    const callbackUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace('http://', 'https://').replace('www.studioclay.se', 'studioclay.se') + '/api/payments/swish/callback';
    logDebug('DEBUG: Sending to callback URL:', callbackUrl);
    
    const callbackResponse = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callbackData)
    });
    
    const callbackResult = await callbackResponse.json();
    
    logDebug('DEBUG: Callback response:', {
      status: callbackResponse.status,
      result: callbackResult
    });
    
    // Uppdatera betalningens status direkt i databasen för att garantera att det fungerar
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: params.status,
        updated_at: new Date().toISOString(),
        metadata: {
          ...payment.metadata,
          debug_status_change: {
            timestamp: new Date().toISOString(),
            old_status: payment.status,
            new_status: params.status
          }
        }
      })
      .eq('id', payment.id);
      
    if (updateError) {
      logError('DEBUG: Error updating payment:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update payment',
        callback_result: callbackResult
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Simulated Swish callback for ${params.paymentReference} with status ${params.status}`,
      payment: {
        id: payment.id,
        reference: payment.payment_reference,
        status: params.status,
        product_type: payment.product_type,
        product_id: payment.product_id
      },
      callback_result: callbackResult
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('DEBUG: Error in Swish debug endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to simulate Swish callback',
      details: errorMessage
    }, { status: 500 });
  }
} 