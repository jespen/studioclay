import { NextResponse } from 'next/server';
import { getCourses, supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    // Get the URL to parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Parse the "published" query parameter
    const publishedParam = searchParams.get('published');
    // If 'all' is specified, pass undefined to get all courses
    // If 'false' is specified, get only unpublished courses
    // Otherwise, get only published courses
    const published = publishedParam === 'all' ? undefined : 
                      publishedParam === 'false' ? false : true;
    
    console.log('API request - published param:', publishedParam);
    console.log('API request - published value:', published);
    
    // Get courses from Supabase
    const courses = await getCourses({ published });
    
    console.log('API response - courses count:', courses.length);
    console.log('API response - courses:', courses.map(c => ({ 
      id: c.id, 
      title: c.title, 
      is_published: c.is_published,
      start_date: c.start_date,
      end_date: c.end_date
    })));
    
    // Return the courses as JSON
    return NextResponse.json({ 
      courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const courseData = await request.json();
    
    // Insert the course into Supabase
    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert(courseData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating course:', error);
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      );
    }
    
    // Return the created course
    return NextResponse.json({ course: data });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' }, 
      { status: 500 }
    );
  }
} 