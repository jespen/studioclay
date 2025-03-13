import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // Get credentials from request
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and password are required' 
      }, { status: 400 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase credentials are not defined in environment variables',
      });
    }
    
    console.log('Testing Supabase login with:', email);
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: `Authentication error: ${error.message}`,
        status: error.status,
        details: error
      });
    }
    
    // Check if we got a valid response
    return NextResponse.json({
      success: true,
      message: 'Supabase login successful',
      user: data.user,
      session: data.session ? 'Active session created' : 'No session created',
    });
    
  } catch (err: any) {
    console.error('Error in Supabase login test:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
} 