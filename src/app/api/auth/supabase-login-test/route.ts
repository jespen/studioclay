import { NextResponse } from 'next/server';

// Removed static export flag

export async function POST() {
  // Since we're using static exports, we'll handle Supabase login testing on the client side
  return NextResponse.json({
    message: 'Supabase login testing is handled on the client side',
    status: 'success'
  });
} 