import { NextRequest, NextResponse } from 'next/server';
import { logDebug, logError } from '@/lib/logging';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { paymentReference, cancelledBy, cancelledFrom } = body;

    if (!paymentReference) {
      return NextResponse.json({
        success: false,
        error: 'Missing payment reference',
      }, { status: 400 });
    }

    // Log the cancellation request
    logDebug('Received simple cancellation request', {
      paymentReference,
      cancelledBy: cancelledBy || 'unknown',
      cancelledFrom: cancelledFrom || 'unknown',
      endpoint: 'simple-cancel'
    });

    // This endpoint only logs the request and returns success
    // It does not actually cancel anything in Swish or update the database
    // It's meant as a fallback when the real cancellation endpoint fails

    // Generate a unique request ID for tracking
    const requestId = `simple-cancel-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Cancellation request received (no database update performed)',
      data: {
        paymentReference,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Log any errors that occur
    logError('Error in simple-cancel endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return error response
    return NextResponse.json({
      success: false,
      error: 'Server error processing cancellation request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 