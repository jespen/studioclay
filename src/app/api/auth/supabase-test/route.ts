import { NextResponse } from 'next/server';

// Removed static export flag

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