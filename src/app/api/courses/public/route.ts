import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic'; // Disable caching for this route

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 }); // No content response
  return addCorsHeaders(response);
}

export async function GET() {
  try {
    console.log('Public courses API: Fetching published courses');
    
    // Get current date to filter out past courses
    const now = new Date().toISOString();
    
    // Fetch published courses from Supabase
    const { data: courses, error } = await supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        template:course_templates (
          *,
          category:categories (
            name
          )
        )
      `)
      .eq('is_published', true)  // Only published courses
      .gte('start_date', now)    // Only future courses
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching public courses:', error);
      const response = NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
      return addCorsHeaders(response);
    }

    // Log success for debugging
    console.log(`Public courses API: Fetched ${courses?.length || 0} published courses`);
    
    // Return the courses with CORS headers
    const response = NextResponse.json({ 
      courses: courses || [],
      timestamp: new Date().toISOString()
    });
    
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Unexpected error in public courses API:', error);
    const response = NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
} 