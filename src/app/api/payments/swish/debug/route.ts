import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logDebug, logError } from '@/lib/logging';
import path from 'path';
import fs from 'fs';
import { SwishService } from '@/services/swish/swishService';
import { PAYMENT_STATUS } from '@/services/swish/types';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Temporär testendpoint för att direkt testa Swish API-integrationen
 * och felsöka certifikatproblem.
 * 
 * OBS: DENNA ENDPOINT MÅSTE TAS BORT INNAN SLUTLIG DRIFTSÄTTNING!
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentReference = searchParams.get('reference');
    const status = searchParams.get('status') || 'PAID';
    
    // Om inget referensnummer anges, returnera endast statusinformation
    if (!paymentReference) {
      return NextResponse.json({
        success: true,
        message: 'Swish debug endpoint',
        usage: 'Call with ?reference=YOUR_PAYMENT_REFERENCE&status=PAID to simulate a callback',
        callback_url: process.env.NEXT_PUBLIC_BASE_URL?.replace('http://', 'https://').replace('www.studioclay.se', 'studioclay.se') + '/api/payments/swish/callback'
      });
    }
    
    logDebug('DEBUG: Simulating Swish callback for reference:', paymentReference);
    
    // Hämta betalningsinformationen från databasen
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', paymentReference)
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
      status: status,
      dateCreated: new Date().toISOString(),
      datePaid: new Date().toISOString(),
      errorCode: status === 'ERROR' ? 'RP07' : undefined,
      errorMessage: status === 'ERROR' ? 'Simulation of error' : undefined
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
        status: status,
        metadata: {
          ...payment.metadata,
          debug_callback: {
            timestamp: new Date().toISOString(),
            data: callbackData
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
      message: `Simulated Swish callback for ${paymentReference} with status ${status}`,
      payment: {
        id: payment.id,
        reference: payment.payment_reference,
        status: status,
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