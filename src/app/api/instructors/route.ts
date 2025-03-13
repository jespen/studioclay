import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

import { getInstructors } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    // Get instructors from Supabase
    const instructors = await getInstructors();
    
    // Return the instructors as JSON
    return NextResponse.json({ 
      instructors,
      count: instructors.length
    });
  } catch (error) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instructors' }, 
      { status: 500 }
    );
  }
} 