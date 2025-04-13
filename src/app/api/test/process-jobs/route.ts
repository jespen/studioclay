import { NextResponse } from 'next/server';
import { processJobs } from '@/lib/jobQueue';
import { logError, logInfo, logDebug } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/utils/supabase';

/**
 * Test endpoint to manually trigger job processing
 * Only available in development mode for testing and debugging
 */
export async function GET() {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  const requestId = uuidv4();
  
  try {
    logInfo('Manual test of job processing triggered', { requestId });
    
    // Get count of pending jobs
    const supabase = createServerSupabaseClient();
    const { count, error: countError } = await supabase
      .from('background_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
      
    if (countError) {
      logError('Error getting job count', { requestId, error: countError.message });
      return NextResponse.json(
        { error: `Failed to get job count: ${countError.message}` },
        { status: 500 }
      );
    }
    
    logDebug(`Found ${count || 0} pending jobs`, { requestId });
    
    // Process jobs
    const result = await processJobs(requestId);
    
    if (result) {
      logInfo('Successfully processed jobs from manual test', { requestId });
      return NextResponse.json({ 
        success: true, 
        message: 'Jobs processed successfully',
        pendingJobsCount: count || 0
      });
    } else {
      logInfo('No jobs processed or processing failed', { requestId });
      
      // If no jobs were processed, provide a way to create a test job
      return NextResponse.json({ 
        success: false, 
        message: 'No jobs processed or processing failed',
        pendingJobsCount: count || 0,
        hint: 'You can use POST to this endpoint to create a test job' 
      });
    }
  } catch (error) {
    logError('Error in manual job processing test', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error processing jobs' },
      { status: 500 }
    );
  }
}

// Create a test job
export async function POST() {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  const requestId = uuidv4();
  
  try {
    logInfo('Creating test job', { requestId });
    
    const supabase = createServerSupabaseClient();
    
    // Create a test job
    const { data, error } = await supabase
      .from('background_jobs')
      .insert({
        id: uuidv4(),
        job_type: 'test_job',
        job_data: {
          test: true,
          created_at: new Date().toISOString(),
          message: 'This is a test job created from the manual test endpoint'
        },
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (error) {
      logError('Error creating test job', { requestId, error: error.message });
      return NextResponse.json(
        { error: `Failed to create test job: ${error.message}` },
        { status: 500 }
      );
    }
    
    logInfo('Successfully created test job', { requestId, jobId: data.id });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test job created successfully',
      jobId: data.id,
      hint: 'You can now use GET on this endpoint to process the test job'
    });
  } catch (error) {
    logError('Error creating test job', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error creating test job' },
      { status: 500 }
    );
  }
} 