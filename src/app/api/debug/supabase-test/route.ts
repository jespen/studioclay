import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logDebug, logError } from '@/lib/logging';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const testId = `test-${Date.now()}`;
  logDebug(`[${testId}] Supabase API test started`);
  
  try {
    // Log environment variables status
    logDebug(`[${testId}] Environment variables status`, {
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrlLength: supabaseUrl?.length || 0,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 5) + '...' : 'not-set',
      nodeEnv: process.env.NODE_ENV
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logDebug(`[${testId}] Supabase client created`);

    // Test 1: Read access
    logDebug(`[${testId}] Testing READ access to payments table`);
    const readStart = Date.now();
    const { data: readData, error: readError } = await supabase
      .from('payments')
      .select('id, status, payment_method')
      .limit(1);
    const readDuration = Date.now() - readStart;

    logDebug(`[${testId}] READ test completed in ${readDuration}ms`, {
      success: !readError,
      hasData: !!readData && readData.length > 0,
      errorCode: readError?.code,
      errorMessage: readError?.message
    });

    // Test 2: Insert temporary record
    logDebug(`[${testId}] Testing INSERT access to payments table`);
    const insertStart = Date.now();
    const testPayment = {
      payment_method: 'test',
      amount: 1,
      currency: 'SEK',
      payment_reference: `TEST-${Date.now()}`,
      product_type: 'test',
      product_id: '00000000-0000-0000-0000-000000000000',
      phone_number: '0700000000',
      user_info: { test: true },
      status: 'TEST'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('payments')
      .insert(testPayment)
      .select('id')
      .single();
    const insertDuration = Date.now() - insertStart;

    logDebug(`[${testId}] INSERT test completed in ${insertDuration}ms`, {
      success: !insertError,
      insertedId: insertData?.id,
      errorCode: insertError?.code,
      errorMessage: insertError?.message
    });

    let updateResult = null;
    let updateError = null;
    
    // Only proceed to update test if insert was successful
    if (insertData?.id) {
      // Test 3: Update the record
      logDebug(`[${testId}] Testing UPDATE access to payments table`);
      const updateStart = Date.now();
      const { data: updateData, error } = await supabase
        .from('payments')
        .update({ 
          status: 'TEST_UPDATED',
          metadata: { test_update: true }
        })
        .eq('id', insertData.id)
        .select('id, status')
        .single();
      const updateDuration = Date.now() - updateStart;

      updateResult = updateData;
      updateError = error;

      logDebug(`[${testId}] UPDATE test completed in ${updateDuration}ms`, {
        success: !error,
        updatedStatus: updateData?.status,
        errorCode: error?.code,
        errorMessage: error?.message
      });

      // Test 4: Delete the test record
      logDebug(`[${testId}] Cleaning up test data`);
      const deleteStart = Date.now();
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', insertData.id);
      const deleteDuration = Date.now() - deleteStart;

      logDebug(`[${testId}] DELETE test completed in ${deleteDuration}ms`, {
        success: !deleteError,
        errorCode: deleteError?.code,
        errorMessage: deleteError?.message
      });
    }

    return NextResponse.json({
      success: true,
      environment: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
        nodeEnv: process.env.NODE_ENV
      },
      tests: {
        read: {
          success: !readError,
          hasData: !!readData && readData.length > 0,
          duration: readDuration,
          error: readError ? {
            code: readError.code,
            message: readError.message
          } : null
        },
        insert: {
          success: !insertError,
          insertedId: insertData?.id,
          duration: insertDuration,
          error: insertError ? {
            code: insertError.code,
            message: insertError.message
          } : null
        },
        update: {
          success: !updateError,
          updatedStatus: updateResult?.status,
          duration: updateResult ? 'measured' : 'skipped',
          error: updateError ? {
            code: updateError.code,
            message: updateError.message
          } : null
        }
      }
    });
  } catch (error) {
    logError(`[${testId}] Unexpected error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error in Supabase test endpoint',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 