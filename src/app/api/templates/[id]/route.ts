import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('Invalid UUID format:', id);
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('course_templates')
      .select(`
        *,
        category:categories (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      throw error;
    }
    
    // Map database fields to client format
    const responseData = {
      ...data,
      title: data.categorie || '',
      is_published: data.published || false
    };
    
    return NextResponse.json({ template: responseData });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('Invalid UUID format:', id);
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    console.log('PATCH request for template:', id, 'with body:', body);
    
    // Check if template exists
    const { data: existingTemplate, error: checkError } = await supabaseAdmin
      .from('course_templates')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      throw checkError;
    }
    
    // Get category name if category_id is provided
    let categoryName = '';
    if (body.category_id) {
      const { data: categoryData, error: categoryError } = await supabaseAdmin
        .from('categories')
        .select('name')
        .eq('id', body.category_id)
        .single();
        
      if (!categoryError && categoryData) {
        categoryName = categoryData.name;
      }
    }
    
    // Update the template with adapted fields
    const { data, error } = await supabaseAdmin
      .from('course_templates')
      .update({
        categorie: categoryName, // Use category name as title
        rich_description: body.rich_description,
        published: body.is_published,
        category_id: body.category_id
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Map database fields to client format
    const responseData = {
      ...data,
      title: data.categorie || '',
      is_published: data.published || false
    };
    
    return NextResponse.json({ template: responseData });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('Invalid UUID format:', id);
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    // First check if there are any instances using this template
    const { data: instances, error: checkError } = await supabaseAdmin
      .from('course_instances')
      .select('id')
      .eq('template_id', id);
    
    if (checkError) throw checkError;
    
    if (instances && instances.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template because it is in use by one or more courses' },
        { status: 400 }
      );
    }
    
    // Delete the template
    const { error } = await supabaseAdmin
      .from('course_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
} 