import { NextRequest, NextResponse } from 'next/server';

// Removed static export flag

export async function GET(request: NextRequest) {
  // Since we're using static exports, we'll handle session info on the client side
  return NextResponse.json({
    message: 'Session info is handled on the client side',
    status: 'success'
  });
} 