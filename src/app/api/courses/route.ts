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
    
    try {
      // Get courses from Supabase
      const courses = await getCourses({ published });
      
      // Filter out any null or undefined courses
      const validCourses = courses.filter(course => course && course.id);
      
      console.log('API response - courses count:', validCourses.length);
      console.log('API response - courses:', validCourses.map(c => ({ 
        id: c.id, 
        title: c.title, 
        is_published: c.is_published,
        start_date: c.start_date,
        end_date: c.end_date
      })));
      
      // Return the courses as JSON
      return NextResponse.json({ 
        courses: validCourses,
        count: validCourses.length
      });
    } catch (error) {
      console.error('Error in getCourses:', error);
      
      // Fallback: direct query to Supabase if getCourses fails
      const query = supabaseAdmin
        .from('courses')
        .select(`
          *,
          category:categories(*),
          instructor:instructors(*)
        `)
        .order('start_date');
        
      if (published !== undefined) {
        query.eq('is_published', published);
      }
      
      const { data, error: supabaseError } = await query;
      
      if (supabaseError) {
        throw supabaseError;
      }
      
      const validCourses = (data || []).filter(course => course && course.id);
      
      console.log('API fallback response - courses count:', validCourses.length);
      
      return NextResponse.json({ 
        courses: validCourses,
        count: validCourses.length
      });
    }
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const courseData = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'title', 'description', 'start_date', 'end_date', 
      'price', 'max_participants', 'category_id', 'instructor_id'
    ];
    
    const missingFields = requiredFields.filter(field => !courseData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          missingFields 
        }, 
        { status: 400 }
      );
    }
    
    // Validate that end_date is after start_date
    const startDate = new Date(courseData.start_date);
    const endDate = new Date(courseData.end_date);
    
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' }, 
        { status: 400 }
      );
    }
    
    // Calculate duration_minutes if not provided
    if (!courseData.duration_minutes) {
      courseData.duration_minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    }
    
    // Set default values for optional fields
    if (courseData.currency === undefined) courseData.currency = 'SEK';
    if (courseData.location === undefined) courseData.location = 'Studio Clay';
    if (courseData.is_published === undefined) courseData.is_published = false;
    
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
      { error: 'Failed to create course', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 