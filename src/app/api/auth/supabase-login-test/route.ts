import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

export async function POST() {
  // Since we're using static exports, we'll handle Supabase login testing on the client side
  return NextResponse.json({
    message: 'Supabase login testing is handled on the client side',
    status: 'success'
  });
} 