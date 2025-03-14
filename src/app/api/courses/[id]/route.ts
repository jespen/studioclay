import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getCourse } from '@/lib/supabaseAdmin';

// Configure the route for static export
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function generateStaticParams() {
  // This is a placeholder function to satisfy static export requirements
  // In a real app, you would generate all possible parameter values
  return [{ id: 'placeholder' }];
}

interface RouteContext {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    console.log('API Route: Fetching course with id:', context.params.id);
    
    const course = await getCourse(context.params.id);
    
    console.log('API Route: Successfully fetched course:', {
      id: course.id,
      title: course.title,
      template_id: course.template_id
    });

    return NextResponse.json({ course });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const body = await request.json();
    console.log('Updating course:', context.params.id, body);

    const { data, error } = await supabaseAdmin
      .from('course_instances')
      .update(body)
      .eq('id', context.params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ course: data });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    console.log('Deleting course:', context.params.id);

    const { error } = await supabaseAdmin
      .from('course_instances')
      .delete()
      .eq('id', context.params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
} 