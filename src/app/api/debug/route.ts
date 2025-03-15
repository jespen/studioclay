import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Test Supabase connection
    const { data, error } = await supabaseAdmin
      .from('course_instances')
      .select('count')
      .limit(1);
    
    // Return environment info
    return NextResponse.json({
      status: 'ok',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      supabase_test: error ? { error: error.message } : { success: true, data },
      // Sanitized env vars for debugging (don't include secrets)
      env_vars: {
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 