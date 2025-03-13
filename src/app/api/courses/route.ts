import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Configure the route for static export
export const dynamic = 'force-static';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const published = searchParams.get('published') || 'all';

    // Fetch courses from Supabase
    const { data: courses, error } = await supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        template:course_templates (
          category:categories (
            name
          )
        )
      `)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter courses based on published parameter
    let filteredCourses = courses;
    if (published === 'true') {
      filteredCourses = courses.filter(course => course.is_published);
    } else if (published === 'false') {
      filteredCourses = courses.filter(course => !course.is_published);
    }

    return NextResponse.json({ courses: filteredCourses });
  } catch (error) {
    console.error('Error in courses API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('course_instances')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ course: data });
  } catch (error) {
    console.error('Error in courses API:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
} 