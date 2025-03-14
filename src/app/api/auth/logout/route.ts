import { NextResponse } from 'next/server';

// Dynamic API route for authentication
export const dynamic = 'force-dynamic';

export async function POST() {
  // Handle logout on the server-side
  return NextResponse.json({
    message: 'Logout processed successfully',
    status: 'success'
  });
}

// Handle logout requests 