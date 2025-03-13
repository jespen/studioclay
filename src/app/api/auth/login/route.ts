import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

export async function POST(request: Request) {
  // Since we're using static exports, we'll handle authentication on the client side
  return NextResponse.json({
    message: 'Authentication is handled on the client side',
    status: 'success'
  });
} 