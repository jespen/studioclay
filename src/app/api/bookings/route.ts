import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

export async function POST() {
  return NextResponse.json({
    message: 'Bookings are handled on the client side',
    status: 'success'
  });
} 