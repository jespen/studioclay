import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Fetch published courses from Supabase
    const { data: courses, error } = await supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        template:course_templates (
          *,
          category:categories (
            name
          )
        )
      `)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    // Return the courses
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Unexpected error in courses API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 