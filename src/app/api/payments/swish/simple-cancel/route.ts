import { NextResponse } from 'next/server';
import { logDebug } from '@/lib/logging';

export async function POST(request: Request) {
  const requestId = `simple-cancel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  logDebug(`[${requestId}] Simple cancel endpoint called`);
  
  try {
    const body = await request.json();
    const { paymentReference, cancelledBy, cancelledFrom } = body;
    
    logDebug(`[${requestId}] Received cancel request for payment:`, {
      paymentReference,
      cancelledBy,
      cancelledFrom
    });
    
    // This endpoint does not actually cancel anything or update the database
    // It just returns success to prevent blocking the UI
    
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
    logDebug(`[${requestId}] Error in simple-cancel:`, error);
    
    // Still return success to avoid blocking the UI
    return NextResponse.json({
      success: true,
      message: 'Cancellation acknowledged with error (no database update performed)',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 