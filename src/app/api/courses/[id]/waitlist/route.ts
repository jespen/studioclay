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
    
    console.log('✅ Valid UUID format, fetching combined waitlist for course ID:', courseId);
    
    // OPTION 2 IMPLEMENTATION: Fetch from both waitlist table AND pending bookings
    
    // 1. Fetch traditional waitlist entries
    const { data: waitlistEntries, error: waitlistError } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    
    if (waitlistError) {
      console.error('❌ Error fetching waitlist:', waitlistError);
      return NextResponse.json(
        { error: 'Failed to fetch waitlist', details: waitlistError.message },
        { status: 500 }
      );
    }
    
    // 2. Fetch pending bookings (these are people moved to waitlist from bookings)
    const { data: pendingBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (bookingsError) {
      console.error('❌ Error fetching pending bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch pending bookings', details: bookingsError.message },
        { status: 500 }
      );
    }
    
    console.log('✅ Successfully fetched waitlist entries:', waitlistEntries?.length || 0);
    console.log('✅ Successfully fetched pending bookings:', pendingBookings?.length || 0);
    
    // 3. Transform pending bookings to match waitlist structure
    const transformedPendingBookings = (pendingBookings || []).map(booking => ({
      id: booking.id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      number_of_participants: booking.number_of_participants,
      message: booking.message,
      created_at: booking.created_at,
      course_id: booking.course_id,
      // Add source indicator to help with UI and future operations
      source: 'booking', // indicates this came from bookings table
      booking_reference: booking.booking_reference // preserve this for admin operations
    }));
    
    // 4. Transform waitlist entries to include source indicator
    const transformedWaitlistEntries = (waitlistEntries || []).map(entry => ({
      ...entry,
      source: 'waitlist', // indicates this came from waitlist table
      booking_reference: null // waitlist entries don't have booking references
    }));
    
    // 5. Combine both lists and sort by created_at (newest first)
    const combinedWaitlist = [
      ...transformedWaitlistEntries,
      ...transformedPendingBookings
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log('✅ Combined waitlist entries:', combinedWaitlist.length);
    console.log('✅ Sources breakdown:', {
      waitlist: transformedWaitlistEntries.length,
      pendingBookings: transformedPendingBookings.length,
      total: combinedWaitlist.length
    });
    
    console.log('=== COURSE WAITLIST API GET END ===');
    
    return NextResponse.json({
      waitlist: combinedWaitlist,
      success: true,
      sources: {
        waitlist: transformedWaitlistEntries.length,
        pendingBookings: transformedPendingBookings.length,
        total: combinedWaitlist.length
      }
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