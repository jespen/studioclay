import { NextResponse } from 'next/server';

// Removed static export flag

export async function GET() {
  // Since we're using static exports, we'll handle auth testing on the client side
  return NextResponse.json({
    message: 'Auth testing is handled on the client side',
    status: 'success'
  });
} 