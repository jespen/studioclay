import { NextResponse } from 'next/server';

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