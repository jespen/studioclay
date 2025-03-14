import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Dynamic API route for course templates
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  // Server-side implementation of course template retrieval
  try {
    const params = await context.params;
    const id = params.id;
    
    const { data, error } = await supabaseAdmin
      .from('course_templates')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching course template:', error);
    return NextResponse.json({ error: 'Failed to fetch course template' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  // Server-side implementation of course template update
  try {
    const params = await context.params;
    const id = params.id;
    const updates = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('course_templates')
      .update(updates)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating course template:', error);
    return NextResponse.json({ error: 'Failed to update course template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  // Server-side implementation of course template deletion
  try {
    const params = await context.params;
    const id = params.id;
    
    const { error } = await supabaseAdmin
      .from('course_templates')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course template:', error);
    return NextResponse.json({ error: 'Failed to delete course template' }, { status: 500 });
  }
} 