import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET all course templates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedParam = searchParams.get('published');
    const published = publishedParam === 'all' ? undefined : 
                      publishedParam === 'false' ? false : true;
    
    console.log('API request - templates - published param:', publishedParam);
    
    try {
      // Get course templates
      const query = supabaseAdmin
        .from('course_templates')
        .select(`
          *,
          category:categories(*),
          instructor:instructors(*)
        `)
        .order('title');
      
      if (published !== undefined) {
        query.eq('is_published', published);
      }
      
      const { data: templates, error } = await query;
      
      if (error) throw error;
      
      console.log('API response - templates count:', templates?.length || 0);
      
      return NextResponse.json({ 
        templates,
        count: templates?.length || 0
      }, { status: 200 });
    } catch (error) {
      console.error('Error fetching course templates:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course templates', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST a new course template
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Creating new course template with data:', data);
    
    const templateData = {
      title: data.title,
      description: data.description,
      duration_minutes: data.duration_minutes,
      price: data.price,
      currency: data.currency || 'SEK',
      max_participants: data.max_participants,
      location: data.location || 'Studio Clay',
      image_url: data.image_url,
      category_id: data.category_id,
      instructor_id: data.instructor_id,
      is_published: data.is_published ?? false
    };
    
    const { data: template, error: templateError } = await supabaseAdmin
      .from('course_templates')
      .insert(templateData)
      .select(`
        *,
        category:categories(*),
        instructor:instructors(*)
      `)
      .single();
    
    if (templateError) {
      console.error('Error creating course template:', templateError);
      return NextResponse.json(
        { error: templateError.message }, 
        { status: 400 }
      );
    }
    
    console.log('Created course template:', template);
    
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error creating course template:', error);
    return NextResponse.json(
      { error: 'Failed to create course template', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 