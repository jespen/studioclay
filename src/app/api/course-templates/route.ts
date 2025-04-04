import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for course templates
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Server-side implementation of course templates retrieval
  console.log('API: Starting GET /api/course-templates');
  try {
    // Get query parameters
    const searchParams = new URL(request.url).searchParams;
    const isActive = searchParams.get('active');
    
    console.log('API: Connecting to Supabase...');
    
    let query = supabaseAdmin
      .from('course_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by active status if specified
    if (isActive !== null) {
      const activeBoolean = isActive === 'true';
      query = query.eq('is_active', activeBoolean);
    }
    
    console.log('API: Executing Supabase query...');
    const { data, error } = await query;
    
    if (error) {
      console.error('API: Supabase error:', error);
      throw error;
    }
    
    if (!data) {
      console.error('API: No data returned from Supabase');
      throw new Error('No data returned from database');
    }
    
    console.log(`API: Fetched ${data.length} course templates`);
    
    return NextResponse.json({ templates: data });
  } catch (error) {
    console.error('Error fetching course templates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch course templates', 
        details: error instanceof Error ? error.message : JSON.stringify(error)
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Server-side implementation of course template creation
  try {
    const templateData = await request.json();
    
    // Validate required fields
    if (!templateData.title) {
      return NextResponse.json(
        { error: 'Title is required' }, 
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('course_templates')
      .insert(templateData)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('API: Successfully created course template:', data.id);
    
    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating course template:', error);
    return NextResponse.json(
      { error: 'Failed to create course template', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 