import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

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
  try {
    // Parse request body
    const body = await request.json();
    const { id, is_paid } = body;
    
    if (!id || typeof is_paid !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields or invalid payment status' },
        { status: 400 }
      );
    }

    console.log(`[API] Updating gift card ${id} payment status to: ${is_paid ? 'PAID' : 'UNPAID'}`);
    
    // Update the gift card payment status with admin privileges
    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .update({ is_paid })
      .eq('id', id)
      .select('*')
      .single();
      
    if (error) {
      console.error('[API] Error updating gift card payment status:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully updated gift card payment status');
    
    // Return the updated gift card
    return NextResponse.json({ success: true, data });
    
  } catch (err: any) {
    console.error('[API] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 