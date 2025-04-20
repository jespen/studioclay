import { NextRequest, NextResponse } from 'next/server';
import { SwishService } from '@/services/swish/swishService';
import { logError, logInfo } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for error logging
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Log the incoming request
    logInfo(`[${requestId}] Cancelling Swish payment`, {
      method: request.method,
      url: request.url
    });

    // Parse the request body
    const requestData = await request.json();

    // Log the request data
    logInfo(`[${requestId}] Request data`, {
      swishPaymentId: requestData.swishPaymentId
    });

    // Get SwishService instance
    const swishService = SwishService.getInstance();

    // Cancel payment
    await swishService.cancelPayment(requestData.swishPaymentId);

    // Log processing time
    const processingTime = Date.now() - startTime;
    logInfo(`[${requestId}] Payment cancelled successfully`, {
      processingTime: `${processingTime}ms`,
      swishPaymentId: requestData.swishPaymentId
    });

    // Return success response
    return NextResponse.json({
      status: 'OK',
      message: 'Payment cancelled successfully'
    }, { status: 200 });

      } catch (error) {
    // Log the error
    logError(`[${requestId}] Error cancelling Swish payment:`, error);

    // Try to log the error to Supabase
    try {
      await supabase.from('error_logs').insert({
        request_id: requestId,
        error_type: 'swish_cancel',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        request_data: await request.json().catch(() => null),
        processing_time: Date.now() - startTime
      });
    } catch (loggingError) {
      logError(`[${requestId}] Failed to log error to database:`, loggingError);
    }

    // Return error response
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'Failed to cancel payment',
        requestId
      },
      { status: 500 }
    );
  }
} 