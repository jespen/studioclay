import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'Supabase URL is not defined in environment variables',
      });
    }
    
    // Extract hostname for DNS lookup
    let hostname;
    try {
      const url = new URL(supabaseUrl);
      hostname = url.hostname;
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: `Invalid URL format: ${supabaseUrl}`,
      });
    }
    
    // Test DNS resolution
    try {
      console.log(`Testing DNS resolution for: ${hostname}`);
      const dnsResult = await lookup(hostname);
      console.log(`DNS resolved to IP: ${dnsResult.address}`);
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: `DNS resolution failed: ${err.message}`,
        hostname: hostname,
        url: supabaseUrl
      });
    }
    
    // Test Supabase REST API endpoint with a simple request
    try {
      console.log(`Testing Supabase API connection`);
      const apiUrl = `${supabaseUrl}/rest/v1/`; 
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Supabase API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({
          success: false,
          error: `Supabase API error: ${response.status} ${response.statusText}`,
          details: errorText,
          hostname,
          url: supabaseUrl
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Supabase connection successful',
        status: response.status,
        hostname,
        url: supabaseUrl
      });
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: `Connection failed: ${err.message}`,
        hostname,
        url: supabaseUrl
      });
    }
  } catch (err: any) {
    console.error('Error in Supabase test:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Unknown error',
    });
  }
} 