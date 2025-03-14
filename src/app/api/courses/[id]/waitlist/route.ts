import { NextResponse } from 'next/server';

// Removed static export flag

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

export const dynamic = 'force-dynamic'; 