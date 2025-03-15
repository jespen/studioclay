import { NextResponse } from 'next/server';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Return basic info without any database calls
    return new NextResponse(JSON.stringify({
      status: 'ok',
      message: 'Simple debug endpoint working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new NextResponse(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 