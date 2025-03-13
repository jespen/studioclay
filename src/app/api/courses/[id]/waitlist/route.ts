import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

export function generateStaticParams() {
  // This is a placeholder function to satisfy static export requirements
  // In a real app, you would generate all possible parameter values
  return [{ id: 'placeholder' }];
}

import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  // Since we're using static exports, we'll handle waitlist operations on the client side
  return NextResponse.json({
    message: 'Waitlist operations are handled on the client side',
    status: 'success'
  });
} 