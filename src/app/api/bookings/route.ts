import { NextResponse } from 'next/server';

// Removed static export flag

export async function POST() {
  return NextResponse.json({
    message: 'Bookings are handled on the client side',
    status: 'success'
  });
} 