import { NextResponse } from 'next/server';
import { getCourses } from '@/lib/supabaseAdmin';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Get the published parameter from the URL
    const { searchParams } = new URL(request.url);
    const published = searchParams.get('published') === 'true';

    // Fetch courses from Supabase
    const courses = await getCourses({ published });

    return NextResponse.json({
      courses,
      status: 'success'
    });
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({
      error: 'Failed to fetch courses',
      message: error.message
    }, { status: 500 });
  }
}

export async function POST() {
  // Since we're using static exports, we'll handle courses on the client side
  return NextResponse.json({
    message: 'Courses are handled on the client side',
    status: 'success'
  });
} 