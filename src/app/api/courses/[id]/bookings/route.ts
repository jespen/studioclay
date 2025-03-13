import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

export async function GET() {
  // Since we're using static exports, we'll handle bookings on the client side
  return NextResponse.json({
    message: 'Bookings are handled on the client side',
    status: 'success'
  });
} 