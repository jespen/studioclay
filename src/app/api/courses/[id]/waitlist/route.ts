import { NextResponse } from 'next/server';

// Removed static export flag

import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    console.log('=== COURSE WAITLIST API GET START ===');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Context received:', context);
    
    const resolvedParams = await context.params;
    console.log('Resolved params:', resolvedParams);
    
    const courseId = resolvedParams.id;
    console.log('Extracted course ID:', courseId);
    console.log('Course ID type:', typeof courseId);
    console.log('Course ID length:', courseId?.length);
    
    // Validate that courseId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValidUUID = uuidRegex.test(courseId);
    console.log('Is valid UUID format:', isValidUUID);
    
    if (!isValidUUID) {
      console.error('❌ Invalid UUID format for course ID:', courseId);
      return NextResponse.json(
        { error: 'Invalid course ID format', courseId: courseId },
        { status: 400 }
      );
    }
    
    console.log('✅ Valid UUID format, fetching waitlist for course ID:', courseId);
    
    // Fetch waitlist entries for the specific course
    const { data: waitlist, error } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching waitlist:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      return NextResponse.json(
        { error: 'Failed to fetch waitlist', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('✅ Successfully fetched waitlist entries:', waitlist?.length || 0);
    console.log('✅ Waitlist data:', JSON.stringify(waitlist, null, 2));
    console.log('=== COURSE WAITLIST API GET END ===');
    
    return NextResponse.json({
      waitlist: waitlist || [],
      success: true
    });
    
  } catch (error) {
    console.error('❌ Server error fetching waitlist:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Server error fetching waitlist' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'; 