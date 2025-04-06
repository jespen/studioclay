import { NextResponse } from 'next/server';
import { SwishService } from '@/services/swish/swishService';
import { logDebug, logError } from '@/lib/logging';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const logId = `cancel-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  try {
    logDebug(`[${logId}] Cancel test endpoint called`);
    
    // Get params and required swishId
    const url = new URL(request.url);
    const paymentIdOrReference = url.searchParams.get('id');
    const skipSwish = url.searchParams.get('skip_swish') === 'true';
    
    if (!paymentIdOrReference) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing payment ID or reference parameter "id"' 
      }, { status: 400 });
    }
    
    logDebug(`[${logId}] Testing cancellation of payment`, { 
      paymentIdOrReference,
      skipSwish
    });
    
    // Check Swish environment and certificate files
    const certDebug: any = {
      NEXT_PUBLIC_SWISH_TEST_MODE: process.env.NEXT_PUBLIC_SWISH_TEST_MODE,
      isTestMode: process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true',
      cwd: process.cwd(),
      swishPaths: {
        test: {
          cert: process.env.SWISH_TEST_CERT_PATH,
          key: process.env.SWISH_TEST_KEY_PATH,
          ca: process.env.SWISH_TEST_CA_PATH
        },
        prod: {
          cert: process.env.SWISH_PROD_CERT_PATH,
          key: process.env.SWISH_PROD_KEY_PATH,
          ca: process.env.SWISH_PROD_CA_PATH
        }
      }
    };

    // Try to access certificate files and confirm they exist
    try {
      const isTest = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
      const paths = {
        cert: isTest ? process.env.SWISH_TEST_CERT_PATH : process.env.SWISH_PROD_CERT_PATH,
        key: isTest ? process.env.SWISH_TEST_KEY_PATH : process.env.SWISH_PROD_KEY_PATH,
        ca: isTest ? process.env.SWISH_TEST_CA_PATH : process.env.SWISH_PROD_CA_PATH
      };
      
      certDebug.fileExists = {
        cert: paths.cert ? fs.existsSync(path.join(process.cwd(), paths.cert)) : false,
        key: paths.key ? fs.existsSync(path.join(process.cwd(), paths.key)) : false,
        ca: paths.ca ? fs.existsSync(path.join(process.cwd(), paths.ca)) : false
      };
      
      certDebug.absolutePaths = {
        cert: paths.cert ? path.join(process.cwd(), paths.cert) : null,
        key: paths.key ? path.join(process.cwd(), paths.key) : null,
        ca: paths.ca ? path.join(process.cwd(), paths.ca) : null
      };
    } catch (certError) {
      certDebug.error = {
        message: certError instanceof Error ? certError.message : 'Unknown error checking certificate files',
        stack: certError instanceof Error ? certError.stack : null
      };
    }
    
    // Get payment details if reference provided
    let swishId = paymentIdOrReference;
    let paymentData = null;
    
    if (paymentIdOrReference.includes('-')) {
      // Looks like a payment reference, let's fetch the Swish ID
      logDebug(`[${logId}] Input looks like payment reference, fetching from database`, { paymentIdOrReference });
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_reference', paymentIdOrReference)
        .single();
        
      if (error) {
        logError(`[${logId}] Database error fetching payment`, error);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch payment from database',
          details: error.message,
          certDebug
        }, { status: 500 });
      }
      
      if (!data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Payment not found',
          certDebug
        }, { status: 404 });
      }
      
      paymentData = data;
      
      if (!data.swish_payment_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Payment does not have a Swish ID',
          details: data,
          certDebug
        }, { status: 400 });
      }
      
      swishId = data.swish_payment_id;
      logDebug(`[${logId}] Found Swish ID from payment reference`, { 
        paymentReference: paymentIdOrReference,
        swishId,
        paymentStatus: data.status
      });
    }
    
    // Option to just update the database status without attempting Swish cancellation
    if (skipSwish) {
      logDebug(`[${logId}] Skipping Swish cancellation, updating database only`);
      
      if (paymentData) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({ 
            status: 'DECLINED',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentData.id);
          
        if (updateError) {
          logError(`[${logId}] Failed to update payment status in database`, updateError);
          return NextResponse.json({
            success: false,
            error: 'Failed to update payment status in database',
            message: updateError.message,
            certDebug
          }, { status: 500 });
        } else {
          logDebug(`[${logId}] Updated payment status to DECLINED in database`);
          return NextResponse.json({
            success: true,
            message: 'Payment marked as DECLINED (Swish API call skipped)',
            paymentId: swishId,
            paymentReference: paymentIdOrReference,
            databaseUpdated: true,
            certDebug
          });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'Cannot skip Swish cancellation for direct Swish ID',
          certDebug
        }, { status: 400 });
      }
    }
    
    // Now attempt the cancellation
    try {
      const swishService = SwishService.getInstance();
      logDebug(`[${logId}] Initialized SwishService, attempting cancellation`, { 
        swishId, 
        isTestMode: swishService.isTestMode() 
      });
      
      // Direct cancellation (no ID resolution)
      await swishService.cancelPayment(swishId, { 
        skipIdCheck: true,
        timeout: 15000  // 15 seconds timeout
      });
      
      logDebug(`[${logId}] Cancellation successful!`);
      
      // If we have payment data, update the status in the database
      if (paymentData) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({ 
            status: 'DECLINED',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentData.id);
          
        if (updateError) {
          logError(`[${logId}] Failed to update payment status in database`, updateError);
        } else {
          logDebug(`[${logId}] Updated payment status to DECLINED in database`);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Payment cancelled successfully',
        paymentId: swishId,
        paymentReference: paymentIdOrReference,
        databaseUpdated: paymentData !== null,
        certDebug
      });
    } catch (error: any) {
      logError(`[${logId}] Error during cancellation`, error);
      
      // If the error is related to certificates, suggest using skip_swish parameter
      if (error.message && (
          error.message.includes('certificate') || 
          error.message.includes('cert') || 
          error.name === 'SwishCertificateError')) {
        return NextResponse.json({
          success: false,
          error: 'Certificate error during cancellation',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null,
          suggestion: 'Try using ?skip_swish=true to update database status only',
          paymentId: swishId,
          paymentReference: paymentIdOrReference,
          certDebug
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Cancellation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        paymentId: swishId,
        paymentReference: paymentIdOrReference,
        certDebug
      }, { status: 500 });
    }
  } catch (error: any) {
    logError(`[${logId}] Unexpected error in cancel-test endpoint`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
} 