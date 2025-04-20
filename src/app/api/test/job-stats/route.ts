import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logError, logInfo } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

/**
 * Admin endpoint to get statistics on background jobs
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
    logInfo('Getting job statistics', { requestId });
    
    const supabase = createServerSupabaseClient();
    
    // Get count of jobs by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('background_jobs')
      .select('status, count(*)')
      .group('status');
      
    if (statusError) {
      logError('Error getting job status counts', { requestId, error: statusError.message });
      return NextResponse.json(
        { error: `Failed to get job status counts: ${statusError.message}` },
        { status: 500 }
      );
    }
    
    // Get count of jobs by type
    const { data: typeCounts, error: typeError } = await supabase
      .from('background_jobs')
      .select('job_type, count(*)')
      .group('job_type');
      
    if (typeError) {
      logError('Error getting job type counts', { requestId, error: typeError.message });
      return NextResponse.json(
        { error: `Failed to get job type counts: ${typeError.message}` },
        { status: 500 }
      );
    }
    
    // Get recent failed jobs
    const { data: recentFailures, error: failureError } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (failureError) {
      logError('Error getting recent failures', { requestId, error: failureError.message });
      return NextResponse.json(
        { error: `Failed to get recent failures: ${failureError.message}` },
        { status: 500 }
      );
    }
    
    // Get oldest pending jobs
    const { data: oldestPending, error: pendingError } = await supabase
      .from('background_jobs')
      .select('id, job_type, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);
      
    if (pendingError) {
      logError('Error getting oldest pending jobs', { requestId, error: pendingError.message });
      return NextResponse.json(
        { error: `Failed to get oldest pending jobs: ${pendingError.message}` },
        { status: 500 }
      );
    }
    
    // Get processing jobs that might be stuck
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const { data: stuckJobs, error: stuckError } = await supabase
      .from('background_jobs')
      .select('id, job_type, created_at, started_at')
      .eq('status', 'processing')
      .lt('started_at', oneHourAgo.toISOString())
      .order('started_at', { ascending: true });
      
    if (stuckError) {
      logError('Error getting stuck jobs', { requestId, error: stuckError.message });
      return NextResponse.json(
        { error: `Failed to get stuck jobs: ${stuckError.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      statistics: {
        byStatus: statusCounts,
        byType: typeCounts,
        recentFailures: recentFailures?.map(job => ({
          id: job.id,
          job_type: job.job_type,
          created_at: job.created_at,
          result: job.result
        })),
        oldestPending,
        potentiallyStuckJobs: stuckJobs
      },
      hints: {
        processingJobs: 'To trigger job processing, call GET /api/test/process-jobs',
        stuckJobs: 'Jobs in "processing" state for >1hr may need to be reset to "pending"'
      }
    });
    
  } catch (error) {
    logError('Error getting job statistics', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error getting job statistics' },
      { status: 500 }
    );
  }
} 