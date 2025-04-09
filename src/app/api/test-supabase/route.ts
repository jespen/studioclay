import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    // Try to fetch a single row from payments table
    const { data, error } = await supabase
      .from('payments')
      .select('id, created_at')
      .limit(1);

    if (error) {
      console.error('Supabase test failed:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: {
          code: error.code,
          hint: error.hint,
          details: error.details
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase',
      data: {
        hasData: data && data.length > 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Unexpected error in Supabase test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 