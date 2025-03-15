import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic'; // Important: Disable caching
export const fetchCache = 'force-no-store'; // Additional cache prevention
export const revalidate = 0; // No revalidation period

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function GET() {
  try {
    console.log('Public courses API: Starting fetch');
    
    // Simplified query - just get all courses for now to diagnose the issue
    const { data: courses, error } = await supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        template:course_templates (*)
      `)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Public API Error:', error);
      return new NextResponse(JSON.stringify({ 
        error: 'Database error', 
        details: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log(`Public API Success: Found ${courses?.length || 0} courses`);
    
    return new NextResponse(JSON.stringify({ 
      courses: courses || [],
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Public API Fatal Error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
} 