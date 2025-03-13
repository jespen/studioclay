import { NextRequest, NextResponse } from 'next/server';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with admin privileges
// This uses environment variables to connect with admin rights
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  // Since we're using static exports, we'll handle gift card payment updates on the client side
  return NextResponse.json({
    message: 'Gift card payment updates are handled on the client side',
    status: 'success'
  });
} 