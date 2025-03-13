import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const resolvedParams = await context.params;
  const id = resolvedParams.id;
  try {
    console.log('API: Fetching course template with ID:', id);
    
    // Fetch the course template
    const { data: template, error } = await supabaseAdmin
      .from('course_templates')
      .select(`
        *,
        category:categories(*),
        instructor:instructors(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('API: Error fetching course template:', error);
      return NextResponse.json({ error: 'Failed to fetch course template' }, { status: 500 });
    }
    
    if (!template) {
      console.error('API: Course template not found');
      return NextResponse.json({ error: 'Course template not found' }, { status: 404 });
    }
    
    console.log('API: Successfully fetched course template:', template.title);
    
    return NextResponse.json({ template }, { status: 200 });
  } catch (err) {
    console.error('API: Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const resolvedParams = await context.params;
  const id = resolvedParams.id;
  try {
    console.log('PATCH request for course template ID:', id);
    
    if (!id) {
      console.error('No valid ID provided for PATCH');
      return NextResponse.json({ error: 'Course template ID is required' }, { status: 400 });
    }
    
    const data = await request.json();
    console.log('Updating course template with data:', data);
    
    // First check if the template exists
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('course_templates')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching course template for update:', fetchError);
      return NextResponse.json({ 
        error: `Course template not found: ${fetchError.message}`,
        details: fetchError
      }, { status: 404 });
    }
    
    if (!existingTemplate) {
      console.error('Course template not found:', id);
      return NextResponse.json({ 
        error: 'Course template not found',
        templateId: id
      }, { status: 404 });
    }
    
    // Update the template
    const { data: updatedTemplate, error: updateError } = await supabaseAdmin
      .from('course_templates')
      .update(data)
      .eq('id', id)
      .select(`
        *,
        category:categories(*),
        instructor:instructors(*)
      `)
      .single();
    
    if (updateError) {
      console.error('Error updating course template:', updateError);
      return NextResponse.json({ 
        error: `Failed to update course template: ${updateError.message}` 
      }, { status: 500 });
    }
    
    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Course template updated but no data returned' }, { status: 500 });
    }
    
    return NextResponse.json({ template: updatedTemplate }, { status: 200 });
  } catch (error) {
    console.error('Error updating course template:', error);
    return NextResponse.json({ 
      error: 'Failed to update course template', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  const resolvedParams = await context.params;
  const id = resolvedParams.id;
  try {
    console.log('DELETE request for course template ID:', id);
    
    if (!id) {
      console.error('No valid ID provided for DELETE');
      return NextResponse.json({ error: 'Course template ID is required' }, { status: 400 });
    }
    
    // First check if the template exists
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('course_templates')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching course template for deletion:', fetchError);
      return NextResponse.json({ 
        error: `Course template not found: ${fetchError.message}` 
      }, { status: 404 });
    }
    
    // Check if there are any instances using this template
    const { data: instances, error: instancesError } = await supabaseAdmin
      .from('course_instances')
      .select('id')
      .eq('template_id', id);
      
    if (instancesError) {
      console.error('Error checking for course instances:', instancesError);
      return NextResponse.json({ 
        error: `Failed to check for course instances: ${instancesError.message}` 
      }, { status: 500 });
    }
    
    if (instances && instances.length > 0) {
      console.error('Cannot delete template with active instances:', instances.length);
      return NextResponse.json({ 
        error: `Cannot delete template with active instances. There are ${instances.length} instances using this template.`,
        instanceCount: instances.length
      }, { status: 400 });
    }
    
    // Delete the template
    const { error } = await supabaseAdmin
      .from('course_templates')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting course template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Course template deleted successfully' 
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting course template:', error);
    return NextResponse.json({ 
      error: 'Failed to delete course template', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 