import { NextResponse } from 'next/server';
import { supabaseAdmin, getCourses } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

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
    
    // Get published courses using the same function as admin API
    const courses = await getCourses({ published: true });
    
    // Filter to include only future courses
    const now = new Date();
    const futureCourses = courses.filter(course => {
      const startDate = course.start_date ? new Date(course.start_date) : null;
      return startDate && startDate >= now;
    });
    
    console.log(`Public API Success: Found ${futureCourses.length} future published courses out of ${courses.length} total published courses`);
    
    return new NextResponse(JSON.stringify({ 
      courses: futureCourses,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
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
        'Cache-Control': 'no-store, no-cache',
      }
    });
  }
} 