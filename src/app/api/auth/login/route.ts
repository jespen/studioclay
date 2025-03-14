import { NextResponse } from 'next/server';

// Removed static export flag

export async function POST(request: Request) {
  // Since we're using static exports, we'll handle authentication on the client side
  return NextResponse.json({
    message: 'Authentication is handled on the client side',
    status: 'success'
  });
} 