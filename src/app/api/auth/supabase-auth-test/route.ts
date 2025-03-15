import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Force dynamic execution for fresh connection check
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    console.log('Attempting Supabase connection test...');
    
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables'
      });
    }
    
    // First check auth service with a lightweight call
    const authResult = await supabaseAdmin.auth.getSession();
    
    if (authResult.error) {
      console.warn('Supabase auth connection test failed:', authResult.error);
      return NextResponse.json({
        success: false,
        error: `Auth service error: ${authResult.error.message}`,
        details: {
          statusCode: authResult.error.status || 'unknown',
          name: authResult.error.name,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...'
        }
      });
    }
    
    // Test the database connection 
    const { data, error } = await supabaseAdmin
      .from('course_instances')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase database connection test failed:', error);
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`,
        supabaseDetails: {
          code: error.code,
          hint: error.hint,
          details: error.details
        }
      });
    }

    console.log('Supabase connection test successful');
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase'
    });
  } catch (error: any) {
    console.error('Unexpected error testing Supabase connection:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Supabase',
      details: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 