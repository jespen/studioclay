import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    // Extract hostname from URL
    let hostname = '';
    try {
      const url = new URL(supabaseUrl);
      hostname = url.hostname;
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Supabase URL format',
        supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'Not provided',
      });
    }
    
    // Check DNS resolution
    let dnsResult;
    try {
      dnsResult = await lookup(hostname);
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: `DNS resolution failed: ${(e as Error).message}`,
        hostname,
        supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'Not provided',
      });
    }
    
    // Try to connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Simple test query
    let data = null;
    let error = null;
    
    try {
      const result = await supabase.from('_dummy_query_').select('*').limit(1);
      data = result.data;
      error = result.error;
    } catch (err: any) {
      error = err;
    }
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is just "relation not found", which is expected
      return NextResponse.json({
        success: false,
        error: `Supabase query error: ${error.message}`,
        hostname,
        ip: dnsResult.address,
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection test successful',
      hostname,
      ip: dnsResult.address,
    });
    
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Unexpected error: ${err.message}`,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
} 