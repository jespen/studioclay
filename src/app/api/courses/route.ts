import { NextResponse } from 'next/server';
import { supabaseAdmin, getCourses } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedParam = searchParams.get('published');
    
    // Convert the string parameter to boolean or undefined
    let published: boolean | undefined;
    if (publishedParam === 'true') published = true;
    if (publishedParam === 'false') published = false;
    
    console.log('API Route: Fetching courses with published:', published);
    
    const courses = await getCourses({ published });
    
    console.log('API Route: Fetched courses count:', courses.length);
    if (courses.length > 0) {
      console.log('API Route: First course sample:', {
        id: courses[0].id,
        title: courses[0].title,
        template_id: courses[0].template_id,
        category: courses[0].category?.name,
        instructor: courses[0].instructor?.name,
        start_date: courses[0].start_date,
        max_participants: courses[0].max_participants,
        current_participants: courses[0].current_participants,
        availableSpots: courses[0].availableSpots
      });
    }

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Creating new course with body:', body);

    // Extract template data from the request
    const templateData = body.template || {};
    
    // Ensure price is a number with default value to prevent null constraint violation
    const price = templateData.price || 0;

    // First create the course template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('course_templates')
      .insert([{
        title: templateData.title || body.title,
        description: templateData.description || body.description,
        price: price,
        currency: templateData.currency || 'SEK',
        category_id: templateData.category_id,
        instructor_id: templateData.instructor_id,
        is_published: body.is_published !== undefined ? body.is_published : false,
        max_participants: body.max_participants || templateData.max_participants,
        location: templateData.location || 'Studio Clay'
      }])
      .select(`
        *,
        category:categories (*),
        instructor:instructors (*)
      `)
      .single();

    if (templateError) {
      console.error('Error creating course template:', templateError);
      return NextResponse.json({ error: templateError.message }, { status: 500 });
    }

    console.log('Created template:', template);

    // Then create the course instance
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('course_instances')
      .insert([{
        template_id: template.id,
        current_participants: 0,
        max_participants: body.max_participants || templateData.max_participants,
        start_date: body.start_date,
        end_date: body.end_date,
        status: 'scheduled'
      }])
      .select()
      .single();

    if (instanceError) {
      console.error('Error creating course instance:', instanceError);
      return NextResponse.json({ error: instanceError.message }, { status: 500 });
    }

    console.log('Created instance:', instance);

    const processedCourse = {
      ...template,
      ...instance,
      template_id: template.id,
      category: template.category || null,
      instructor: template.instructor || null,
      availableSpots: instance.max_participants
    };

    console.log('Final processed course:', processedCourse);

    return NextResponse.json({ course: processedCourse });
  } catch (error) {
    console.error('Error in courses API:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
} 