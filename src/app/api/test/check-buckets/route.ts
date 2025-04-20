import { NextResponse } from 'next/server';

// Temporary disabled endpoint
export async function GET() {
  return NextResponse.json({
    message: 'This test endpoint has been temporarily disabled',
    status: 'disabled'
  });
} 