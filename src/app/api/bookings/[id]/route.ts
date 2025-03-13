import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

// Update a booking
export async function PATCH() {
  return NextResponse.json({
    message: 'Bookings are handled on the client side',
    status: 'success'
  });
}

// Delete a booking
export async function DELETE() {
  return NextResponse.json({
    message: 'Bookings are handled on the client side',
    status: 'success'
  });
} 