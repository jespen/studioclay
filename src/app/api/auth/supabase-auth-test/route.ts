import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Removed static export flag

export async function GET() {
  try {
    // Test the connection by making a simple query
    const { data, error } = await supabaseAdmin
      .from('course_instances')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase'
    });
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Supabase'
    });
  }
} 