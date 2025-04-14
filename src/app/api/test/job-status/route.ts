import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logError, logInfo, logWarning } from '@/lib/logging';
import { JobStatus } from '@/lib/jobQueue';

/**
 * Debug endpoint för att visa statusen för bakgrundsjobb
 * Endast tillgängligt i utvecklingsläge
 */
export async function GET(req: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }
  
  try {
    logInfo('Job status API called');
    
    const supabase = createServerSupabaseClient();
    
    // Get the status counts
    const statusCounts: Record<JobStatus, number> = {
      'pending': 0, 
      'processing': 0, 
      'completed': 0, 
      'failed': 0
    };
    
    // Hämta antal jobb per status
    const statuses: JobStatus[] = ['pending', 'processing', 'completed', 'failed'];
    for (const status of statuses) {
      const { count, error } = await supabase
        .from('background_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
        
      if (error) {
        throw new Error(`Failed to get count for ${status} jobs: ${error.message}`);
      }
      
      statusCounts[status] = count || 0;
    }
    
    // Hämta senaste jobb
    // Använd en mer robust metod som inte förutsätter exakta kolumner
    const { data: latestJobs, error: jobsError } = await supabase
      .from('background_jobs')
      .select('id, job_type, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (jobsError) {
      throw new Error(`Failed to get latest jobs: ${jobsError.message}`);
    }
    
    // Räkna jobbtyper
    const jobTypeCounts: Record<string, number> = {};
    
    if (latestJobs) {
      for (const job of latestJobs) {
        const jobType = job.job_type;
        if (!jobTypeCounts[jobType]) {
          jobTypeCounts[jobType] = 0;
        }
        jobTypeCounts[jobType]++;
      }
    }
    
    // Process the jobs for better display
    const processedJobs = latestJobs?.map(job => {
      // Försök hämta extra information, men hantera fall där kolumner saknas
      try {
        return {
          id: job.id,
          type: job.job_type,
          status: job.status,
          created_at: job.created_at,
          updated_at: job.updated_at || null,
          age_seconds: job.created_at 
            ? Math.round((Date.now() - new Date(job.created_at).getTime()) / 1000) 
            : null,
          actions: [
            {
              label: 'Manually Process',
              url: `/api/test/process-jobs`
            }
          ]
        };
      } catch (error) {
        // Fallback om något fält saknas
        return {
          id: job.id,
          type: job.job_type,
          status: job.status,
          created_at: job.created_at,
          error: 'Could not parse all job data'
        };
      }
    });
    
    // Hämta mer detaljerad information om senaste misslyckade jobbena
    const { data: failedJobs, error: failedJobsError } = await supabase
      .from('background_jobs')
      .select('id, job_type, job_data, error_message, created_at, started_at, completed_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (failedJobsError) {
      logWarning('Failed to fetch failed jobs', { error: failedJobsError.message });
    }

    // Formatera och logga felmeddelanden
    let failedJobDetails: Array<{
      id: string;
      jobType: string;
      created: string;
      error: string;
      productId: string;
      productType: string;
      invoiceNumber: string;
    }> = [];
    if (failedJobs && failedJobs.length > 0) {
      failedJobDetails = failedJobs.map(job => ({
        id: job.id,
        jobType: job.job_type,
        created: job.created_at,
        error: job.error_message || 'No error message provided',
        productId: job.job_data?.productId || 'N/A',
        productType: job.job_data?.productType || 'N/A',
        invoiceNumber: job.job_data?.invoiceNumber || 'N/A',
      }));
    }

    // Addera tips om hur man återskapar ett jobb
    const troubleshootingTips = {
      retryInstructions: "To retry a failed job, update its status to 'pending' with:",
      sqlExample: `UPDATE background_jobs SET status = 'pending', updated_at = NOW() WHERE id = 'job-id-here';`,
      resetAllJobs: "To reset all failed jobs: UPDATE background_jobs SET status = 'pending', updated_at = NOW() WHERE status = 'failed';"
    };

    // Returnera resultatet
    return NextResponse.json({
      success: true,
      status_counts: statusCounts,
      job_type_counts: jobTypeCounts,
      total_jobs: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      latest_jobs: processedJobs || [],
      failedJobs: failedJobDetails,
      troubleshooting: troubleshootingTips
    });
  } catch (error) {
    logError('Error fetching job status', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch job status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 