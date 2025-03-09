import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase credentials are not defined in environment variables',
      });
    }
    
    console.log('Testing Supabase authentication with:');
    console.log(`URL: ${supabaseUrl}`);
    console.log(`Key: ${supabaseKey.substring(0, 10)}...`); // Only log beginning of key for security
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test the authentication API
    const { data, error } = await supabase.auth.getSession();
    
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
      message: 'Supabase authentication API connection successful',
      session: data.session ? 'Active session found' : 'No active session',
      data: data
    });
    
  } catch (err: any) {
    console.error('Error in Supabase auth test:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
} 