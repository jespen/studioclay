import { NextRequest, NextResponse } from 'next/server';

// Import the proper supabaseAdmin instance
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Removed static export flag

export async function POST(request: NextRequest) {
  // Since we're using static exports, we'll handle gift card status updates on the client side
  return NextResponse.json({
    message: 'Gift card status updates are handled on the client side',
    status: 'success'
  });
} 