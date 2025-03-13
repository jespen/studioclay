import { NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

export async function GET() {
  // Since we're using static exports, we'll handle Supabase testing on the client side
  return NextResponse.json({
    message: 'Supabase testing is handled on the client side',
    status: 'success'
  });
} 