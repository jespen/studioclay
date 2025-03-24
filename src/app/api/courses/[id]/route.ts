import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getCourse } from '@/lib/supabaseAdmin';

// Dynamic API route for course details
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Wait for params to be fully resolved before using them
    const params = await Promise.resolve(context.params);
    const courseId = params.id;
    
    console.log('API Route: Fetching course with id:', courseId);
    
    if (!courseId) {
      console.error('API Route Error: Missing course ID');
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    const course = await getCourse(courseId);
    
    if (!course) {
      console.error('API Route Error: Course not found with ID:', courseId);
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Det behövs ingen mappning eftersom vi nu använder price direkt
    const responseData = {
      ...course
    };
    
    console.log('API Route: Successfully fetched course:', {
      id: course.id,
      title: course.title,
      template_id: course.template_id
    });

    return NextResponse.json({ course: responseData });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Wait for params to be fully resolved before using them
    const params = await Promise.resolve(context.params);
    const { id } = params;
    
    if (!id) {
      console.error('API Route Error: Missing course ID for update');
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    console.log('Updating course with ID:', id);
    
    const body = await request.json();
    console.log('Update payload:', body);

    // Ingen konvertering behövs längre eftersom vi använder price direkt
    const dbBody = { ...body };

    const { data, error } = await supabaseAdmin
      .from('course_instances')
      .update(dbBody)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating course:', error);
      throw error;
    }

    if (!data) {
      console.error('No data returned after course update, course might not exist');
      return NextResponse.json(
        { error: 'Course not found or could not be updated' },
        { status: 404 }
      );
    }

    console.log('Course successfully updated:', {
      id: data.id,
      title: data.title,
      template_id: data.template_id
    });

    // Ingen konvertering behövs längre
    const responseData = {
      ...data
    };

    return NextResponse.json({ course: responseData });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Wait for params to be fully resolved before using them
    const params = await Promise.resolve(context.params);
    const { id } = params;
    
    if (!id) {
      console.error('API Route Error: Missing course ID for deletion');
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    console.log('Deleting course with ID:', id);

    const { error } = await supabaseAdmin
      .from('course_instances')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting course:', error);
      throw error;
    }

    console.log('Course successfully deleted:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 