import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedParam = searchParams.get('published');
    const published = publishedParam === 'all' ? undefined : 
                      publishedParam === 'false' ? false : true;
    
    console.log('API request - published param:', publishedParam);
    console.log('API request - published value:', published);
    
    try {
      // Get course instances with their templates
      const query = supabaseAdmin
        .from('course_instances')
        .select(`
          *,
          template:course_templates(
            *,
            category:categories(*),
            instructor:instructors(*)
          )
        `)
        .order('start_date');
      
      if (published !== undefined) {
        query.eq('is_published', published);
      }
      
      const { data: instances, error } = await query;
      
      if (error) throw error;
      
      // Filter out any null or undefined instances
      const validInstances = (instances || []).filter(instance => 
        instance && instance.id && instance.template
      );
      
      // Process instances to ensure valid participant counts and calculate available spots
      const processedInstances = validInstances.map(instance => {
        // Ensure current_participants is a valid number
        if (instance.current_participants === null || instance.current_participants === undefined) {
          instance.current_participants = 0;
        }
        
        // Calculate available spots
        const availableSpots = instance.max_participants !== null 
          ? instance.max_participants - instance.current_participants 
          : null;
        
        // Combine template and instance data, ensuring instance properties take precedence
        return {
          ...instance.template, // Template data first (base properties)
          ...instance, // Instance data overrides template properties
          availableSpots,
          template_id: instance.template.id, // Preserve template reference
          category: instance.template.category, // Preserve nested objects
          instructor: instance.template.instructor
        };
      });
      
      console.log('API response - courses count:', processedInstances.length);
      
      return new Response(JSON.stringify({ 
        courses: processedInstances,
        count: processedInstances.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return new Response(JSON.stringify(
      { error: 'Failed to fetch courses', details: error instanceof Error ? error.message : String(error) }
    ), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Creating new course with data:', data);
    
    // If we have a template_id, we're creating a new instance of an existing template
    if (data.template_id) {
      const instanceData = {
        template_id: data.template_id,
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        max_participants: data.max_participants,
        current_participants: 0,
        is_published: data.is_published ?? false
      };
      
      const { data: instance, error: instanceError } = await supabaseAdmin
        .from('course_instances')
        .insert(instanceData)
        .select(`
          *,
          template:course_templates(
            *,
            category:categories(*),
            instructor:instructors(*)
          )
        `)
        .single();
      
      if (instanceError) {
        console.error('Error creating course instance:', instanceError);
        return NextResponse.json(
          { error: instanceError.message }, 
          { status: 400 }
        );
      }
      
      // Process the response to match the expected format
      const course = {
        ...instance,
        ...instance.template,
        template_id: instance.template.id,
        availableSpots: instance.max_participants - (instance.current_participants || 0)
      };
      
      return NextResponse.json({ course });
    }
    
    // Otherwise, we're creating a new template and instance
    const templateData = {
      title: data.template?.title || data.title,
      description: data.template?.description || data.description,
      duration_minutes: data.template?.duration_minutes || data.duration_minutes,
      price: data.template?.price || data.price || 0, // Ensure price is never null
      currency: data.template?.currency || data.currency || 'SEK',
      max_participants: data.template?.max_participants || data.max_participants,
      location: data.template?.location || data.location || 'Studio Clay',
      image_url: data.template?.image_url || data.image_url,
      category_id: data.template?.category_id || data.category_id,
      instructor_id: data.template?.instructor_id || data.instructor_id,
      is_published: data.template?.is_published || data.is_published || false
    };
    
    // Validate required fields
    if (!templateData.price || templateData.price <= 0) {
      return NextResponse.json(
        { error: 'Price is required and must be greater than 0' }, 
        { status: 400 }
      );
    }
    
    if (!templateData.category_id) {
      return NextResponse.json(
        { error: 'Category is required' }, 
        { status: 400 }
      );
    }
    
    const { data: template, error: templateError } = await supabaseAdmin
      .from('course_templates')
      .insert(templateData)
      .select()
      .single();
    
    if (templateError) {
      console.error('Error creating course template:', templateError);
      return NextResponse.json(
        { error: templateError.message }, 
        { status: 400 }
      );
    }
    
    console.log('Created course template:', template);
    
    // Then create the course instance
    const instanceData = {
      template_id: template.id,
      title: data.title,
      start_date: data.start_date,
      end_date: data.end_date,
      max_participants: data.max_participants,
      current_participants: 0,
      is_published: data.is_published ?? false
    };
    
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('course_instances')
      .insert(instanceData)
      .select(`
        *,
        template:course_templates(
          *,
          category:categories(*),
          instructor:instructors(*)
        )
      `)
      .single();
    
    if (instanceError) {
      console.error('Error creating course instance:', instanceError);
      // If instance creation fails, delete the template
      await supabaseAdmin
        .from('course_templates')
        .delete()
        .eq('id', template.id);
        
      return NextResponse.json(
        { error: instanceError.message }, 
        { status: 400 }
      );
    }
    
    console.log('Created course instance:', instance);
    
    // Process the response to match the expected format
    const course = {
      ...instance,
      ...instance.template,
      template_id: instance.template.id,
      availableSpots: instance.max_participants - (instance.current_participants || 0)
    };
    
    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 