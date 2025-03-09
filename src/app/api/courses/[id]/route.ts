import { NextResponse } from 'next/server';
import { supabaseAdmin, getCourse } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    // Extract the ID from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    const course = await getCourse(id);
    
    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Extract the ID from the URL
    const url = new URL(request.url);
    console.log('PATCH request URL:', url.toString());
    console.log('PATCH request pathname:', url.pathname);
    
    // Try to extract ID from pathname
    const pathParts = url.pathname.split('/');
    console.log('Path parts:', pathParts);
    
    // Find the ID in the path - it should be after 'courses'
    let id = '';
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'courses' && i + 1 < pathParts.length) {
        id = pathParts[i + 1];
        break;
      }
    }
    
    // If not found, try the last part
    if (!id) {
      id = pathParts[pathParts.length - 1];
    }
    
    console.log('Extracted ID:', id);
    
    if (!id || id === '' || id === 'courses') {
      console.error('No valid ID extracted from URL');
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    console.log('Updating course with data:', data);
    
    // First check if the course exists
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError || !existingCourse) {
      console.error('Error fetching course for update:', fetchError);
      return NextResponse.json(
        { error: `Course not found: ${fetchError?.message || 'Course does not exist'}` },
        { status: 404 }
      );
    }
    
    // If updating dates, validate that end_date is after start_date
    if (data.start_date || data.end_date) {
      const startDate = new Date(data.start_date || existingCourse.start_date);
      const endDate = new Date(data.end_date || existingCourse.end_date);
      
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' }, 
          { status: 400 }
        );
      }
      
      // Recalculate duration_minutes if dates are changing
      if (data.start_date || data.end_date) {
        data.duration_minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
      }
    }
    
    // Now update the course
    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating course:', error);
      return NextResponse.json(
        { error: `Failed to update course: ${error.message}` },
        { status: 400 }
      );
    }
    
    if (!course) {
      return NextResponse.json(
        { error: 'Course updated but no data returned' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Extract the ID from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    // First check if the course exists
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError || !existingCourse) {
      console.error('Error fetching course for deletion:', fetchError);
      return NextResponse.json(
        { error: `Course not found: ${fetchError?.message || 'Course does not exist'}` },
        { status: 404 }
      );
    }
    
    // Now delete the course
    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting course:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 