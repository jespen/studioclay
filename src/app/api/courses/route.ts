import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  // Since we're using static exports, we'll handle courses on the client side
  return NextResponse.json({
    message: 'Courses are handled on the client side',
    status: 'success'
  });
}

export async function POST() {
  // Since we're using static exports, we'll handle courses on the client side
  return NextResponse.json({
    message: 'Courses are handled on the client side',
    status: 'success'
  });
} 