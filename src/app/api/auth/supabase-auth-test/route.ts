import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

export async function GET() {
  // Since we're using static exports, we'll handle Supabase auth testing on the client side
  return NextResponse.json({
    message: 'Supabase auth testing is handled on the client side',
    status: 'success'
  });
} 