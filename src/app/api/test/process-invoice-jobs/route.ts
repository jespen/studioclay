import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logDebug, logError, logInfo } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';
import { processJobs } from '@/lib/jobQueue';

/**
 * Test endpoint to manually process invoice jobs
 * This is for debugging the invoice generation process
 * Only available in development mode
 */
export async function GET(req: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  const requestId = uuidv4();
  
  try {
    logInfo('Manual invoice job processing triggered', { requestId });
    
    // Get pending invoice jobs
    const supabase = createServerSupabaseClient();
    const { data: pendingJobs, error: jobsError } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('job_type', 'invoice_email')
      .order('created_at', { ascending: true });
      
    if (jobsError) {
      logError('Error getting pending invoice jobs', { requestId, error: jobsError.message });
      return NextResponse.json(
        { error: `Failed to get pending invoice jobs: ${jobsError.message}` },
        { status: 500 }
      );
    }
    
    // If no pending jobs, return early
    if (!pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({ message: 'No pending invoice jobs to process' });
    }
    
    logInfo(`Found ${pendingJobs.length} pending invoice jobs`, { requestId });
    
    // Process the jobs
    const result = await processJobs(requestId);
    
    // Return detailed information for debugging
    return NextResponse.json({
      success: result,
      message: result 
        ? `Successfully processed invoice jobs` 
        : 'Failed to process invoice jobs',
      pendingJobCount: pendingJobs.length,
      pendingJobs: pendingJobs.map(job => ({
        id: job.id,
        createdAt: job.created_at,
        data: {
          invoiceNumber: job.job_data.invoiceNumber,
          paymentReference: job.job_data.paymentReference,
          productType: job.job_data.productType
        }
      }))
    });
    
  } catch (error) {
    logError('Error in manual invoice job processing', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error processing invoice jobs' },
      { status: 500 }
    );
  }
} 