import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    // Get templates with count of related instances
    const { data, error } = await supabaseAdmin
      .from('course_templates')
      .select(`
        *,
        category:categories (*),
        instances_count:course_instances (count)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Process the data to format the instances count and adapt field names
    const processedData = data.map((template) => ({
      ...template,
      // Map database fields to expected client fields
      title: template.categorie || '',
      is_published: template.published || false,
      instances_count: template.instances_count[0]?.count || 0
    }));
    
    return NextResponse.json({ templates: processedData });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.category_id) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }
    
    // Get category name
    let categoryName = '';
    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('name')
      .eq('id', body.category_id)
      .single();
      
    if (!categoryError && categoryData) {
      categoryName = categoryData.name;
    } else {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }
    
    // Create new template with adapted fields
    const { data, error } = await supabaseAdmin
      .from('course_templates')
      .insert({
        categorie: categoryName, // Use category name as title
        rich_description: body.rich_description || '',
        published: body.is_published || false,
        category_id: body.category_id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Transform response to match expected client format
    const responseData = {
      ...data,
      title: data.categorie,
      is_published: data.published
    };
    
    return NextResponse.json({ template: responseData });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
} 