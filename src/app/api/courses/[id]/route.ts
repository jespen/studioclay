import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function generateStaticParams() {
  // This is a placeholder function to satisfy static export requirements
  // In a real app, you would generate all possible parameter values
  return [{ id: 'placeholder' }];
}

import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    console.log('API: Fetching course instance with ID:', id);
    
    // Fetch the course instance with its template
    const { data: course, error } = await supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        template:course_templates(
          *,
          category:categories(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('API: Error fetching course:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (!course) {
      console.error('API: Course not found');
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    console.log('API: Successfully fetched course:', course.title);
    
    // Calculate available spots
    const availableSpots = course.max_participants !== null 
      ? course.max_participants - course.current_participants 
      : null;
    console.log('API: Available spots:', availableSpots);

    return NextResponse.json({ 
      course: {
        ...course,
        availableSpots
      }
    });
  } catch (error) {
    console.error('API: Error in course fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    console.log('PATCH request for course instance ID:', id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Course instance ID is required' },
        { status: 400 }
      );
    }

    // Get the update data from the request
    const data = await request.json();
    console.log('Updating course instance with data:', data);

    // First, get the current instance to get the template_id
    const { data: currentInstance, error: fetchError } = await supabaseAdmin
      .from('course_instances')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching course instance:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 404 }
      );
    }

    // Update the instance
    const instanceData = {
      title: data.title,
      start_date: data.start_date,
      end_date: data.end_date,
      max_participants: data.max_participants,
      is_published: data.is_published
    };

    const { error: instanceError } = await supabaseAdmin
      .from('course_instances')
      .update(instanceData)
      .eq('id', id);

    if (instanceError) {
      console.error('Error updating course instance:', instanceError);
      return NextResponse.json(
        { error: instanceError.message },
        { status: 400 }
      );
    }

    // If template data is provided, update the template
    if (data.template && currentInstance.template_id) {
      const templateData = {
        title: data.template.title,
        description: data.template.description,
        duration_minutes: data.template.duration_minutes,
        price: data.template.price,
        currency: data.template.currency || 'SEK',
        category_id: data.template.category_id,
        instructor_id: data.template.instructor_id,
        max_participants: data.template.max_participants,
        location: data.template.location || 'Studio Clay',
        is_published: data.template.is_published
      };

      const { error: templateError } = await supabaseAdmin
        .from('course_templates')
        .update(templateData)
        .eq('id', currentInstance.template_id);

      if (templateError) {
        console.error('Error updating course template:', templateError);
        return NextResponse.json(
          { error: templateError.message },
          { status: 400 }
        );
      }
    }

    // Fetch the updated instance with its template
    const { data: updatedInstance, error: fetchUpdatedError } = await supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        template:course_templates(
          *,
          category:categories(*),
          instructor:instructors(*)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchUpdatedError) {
      console.error('Error fetching updated course:', fetchUpdatedError);
      return NextResponse.json(
        { error: fetchUpdatedError.message },
        { status: 400 }
      );
    }

    // Process the response to match the expected format
    const course = {
      ...updatedInstance,
      ...updatedInstance.template,
      template_id: updatedInstance.template.id,
      availableSpots: updatedInstance.max_participants - (updatedInstance.current_participants || 0)
    };

    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error in PATCH route:', error);
    return NextResponse.json(
      { error: 'Failed to update course', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    console.log('DELETE request for course instance ID:', id);
    
    if (!id) {
      console.error('No valid ID provided for DELETE');
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }
    
    // First check if the instance exists
    const { data: existingInstance, error: fetchError } = await supabaseAdmin
      .from('course_instances')
      .select('*')
      .eq('id', id)
      .single();
      
    // Even if the instance doesn't exist, try to delete it anyway
    const { error } = await supabaseAdmin
      .from('course_instances')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting course instance:', error);
      
      // If the error is about foreign key constraints, try to delete any related records
      if (error.message?.includes('foreign key constraint')) {
        console.log('Attempting to clean up related records...');
        
        // Try to delete any bookings for this course
        await supabaseAdmin
          .from('bookings')
          .delete()
          .eq('course_id', id);
          
        // Try to delete any waitlist entries for this course
        await supabaseAdmin
          .from('waitlist')
          .delete()
          .eq('course_id', id);
          
        // Try deleting the course instance again
        const { error: retryError } = await supabaseAdmin
          .from('course_instances')
          .delete()
          .eq('id', id);
          
        if (retryError) {
          console.error('Error in retry delete:', retryError);
          return NextResponse.json(
            { error: retryError.message },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE route:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
} 