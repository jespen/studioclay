// This script will forcefully remove a problematic course instance
// Run with: node src/scripts/cleanup-course.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const COURSE_ID = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

async function cleanupCourse() {
  console.log(`Starting cleanup for course instance: ${COURSE_ID}`);

  try {
    // Check if the course instance exists
    const { data: courseInstance, error: courseError } = await supabase
      .from('course_instances')
      .select('*')
      .eq('id', COURSE_ID)
      .single();

    if (courseError) {
      console.log(`Course instance not found or error: ${courseError.message}`);
    } else {
      console.log('Found course instance:', courseInstance);
    }

    // Check for related bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('course_id', COURSE_ID);

    if (bookingsError) {
      console.error('Error checking bookings:', bookingsError);
    } else {
      console.log(`Found ${bookings.length} related bookings`);
    }

    // Check for related waitlist entries
    const { data: waitlist, error: waitlistError } = await supabase
      .from('waitlist')
      .select('*')
      .eq('course_id', COURSE_ID);

    if (waitlistError) {
      console.error('Error checking waitlist:', waitlistError);
    } else {
      console.log(`Found ${waitlist.length} related waitlist entries`);
    }

    // Step 1: Delete related bookings
    const { error: deleteBookingsError } = await supabase
      .from('bookings')
      .delete()
      .eq('course_id', COURSE_ID);

    if (deleteBookingsError) {
      console.error('Error deleting bookings:', deleteBookingsError);
    } else {
      console.log('Successfully deleted related bookings');
    }

    // Step 2: Delete related waitlist entries
    const { error: deleteWaitlistError } = await supabase
      .from('waitlist')
      .delete()
      .eq('course_id', COURSE_ID);

    if (deleteWaitlistError) {
      console.error('Error deleting waitlist entries:', deleteWaitlistError);
    } else {
      console.log('Successfully deleted related waitlist entries');
    }

    // Step 3: Try to update any foreign key references to null
    // This is a fallback in case there are other tables referencing this course
    try {
      await supabase.rpc('update_course_references_to_null', { course_id: COURSE_ID });
      console.log('Updated any remaining references to null');
    } catch (rpcError) {
      console.log('RPC function not available or error:', rpcError);
      // This is expected if the RPC function doesn't exist
    }

    // Step 4: Delete the course instance
    const { error: deleteCourseError } = await supabase
      .from('course_instances')
      .delete()
      .eq('id', COURSE_ID);

    if (deleteCourseError) {
      console.error('Error deleting course instance:', deleteCourseError);
      
      // If we still can't delete, try a raw SQL query as a last resort
      try {
        const { error: rawSqlError } = await supabase.rpc('force_delete_course', { course_id: COURSE_ID });
        if (rawSqlError) {
          console.error('Error with force delete:', rawSqlError);
        } else {
          console.log('Force delete successful');
        }
      } catch (rpcError) {
        console.log('Force delete RPC not available:', rpcError);
      }
    } else {
      console.log('Successfully deleted course instance');
    }

    // Verify the course is gone
    const { data: verifyData, error: verifyError } = await supabase
      .from('course_instances')
      .select('*')
      .eq('id', COURSE_ID);

    if (verifyError) {
      console.error('Error verifying deletion:', verifyError);
    } else {
      console.log(`Verification: ${verifyData.length === 0 ? 'Course successfully deleted' : 'Course still exists!'}`);
    }

  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
cleanupCourse()
  .then(() => {
    console.log('Cleanup process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 