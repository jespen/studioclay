import { NextResponse } from 'next/server';

// Removed static export flag

export async function GET() {
  // Since we're using static exports, we'll handle booking history on the client side
  return NextResponse.json({
    message: 'Booking history is handled on the client side',
    status: 'success'
  });
} 