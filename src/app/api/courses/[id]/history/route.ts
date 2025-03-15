import { NextResponse } from 'next/server';

// Dynamic API route
export const dynamic = 'force-dynamic';

export async function GET() {
  // We no longer need booking history as we use the status field to track lifecycle
  return NextResponse.json({
    message: 'Booking history has been replaced by the status field on bookings. Use the bookings API with status filter to get cancelled bookings.',
    status: 'success'
  });
} 