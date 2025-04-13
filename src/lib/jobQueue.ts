import { createServerSupabaseClient } from '@/utils/supabase';
import { logError, logInfo } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

export type JobType = 'invoice_email' | 'order_confirmation' | 'gift_card_delivery';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface BackgroundJob {
  id?: string;
  job_type: JobType;
  job_data: any;
  status: JobStatus;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  result?: any;
}

/**
 * Create a new background job in the database
 */
export async function createBackgroundJob(
  jobType: JobType,
  jobData: any,
  logContext: { requestId: string } = { requestId: uuidv4() }
): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  
  try {
    const newJob: BackgroundJob = {
      id: uuidv4(),
      job_type: jobType,
      job_data: jobData,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('background_jobs')
      .insert(newJob)
      .select('id')
      .single();
      
    if (error) {
      logError(`Failed to create background job: ${error.message}`, logContext);
      return null;
    }
    
    logInfo(`Created background job ${data.id} of type ${jobType}`, {
      ...logContext,
      jobId: data.id
    });
    
    // If we're in development, trigger the job processor immediately
    if (process.env.NODE_ENV === 'development') {
      await processJobs(logContext.requestId);
    }
    
    return data.id;
  } catch (error) {
    logError(`Error creating background job: ${error instanceof Error ? error.message : 'Unknown error'}`, logContext);
    return null;
  }
}

/**
 * Process jobs by calling the job processor endpoint
 * This is useful for development and testing
 */
export async function processJobs(requestId: string = uuidv4()): Promise<boolean> {
  try {
    // Determine the base URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Get the job processor token
    const token = process.env.JOB_PROCESSOR_TOKEN || 'dev-token';
    
    // Call the job processor endpoint
    const response = await fetch(`${baseUrl}/api/jobs/process?token=${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      logError(`Job processor returned error: ${JSON.stringify(error)}`, { requestId });
      return false;
    }
    
    const result = await response.json();
    
    if (result.success) {
      logInfo(`Job processor successfully processed job: ${result.jobId}`, { requestId });
      return true;
    } else if (result.message === "No pending jobs") {
      logInfo(`Job processor found no pending jobs`, { requestId });
      return true;
    } else {
      logError(`Job processor failed to process job: ${JSON.stringify(result)}`, { requestId });
      return false;
    }
  } catch (error) {
    logError(`Error calling job processor: ${error instanceof Error ? error.message : 'Unknown error'}`, { requestId });
    return false;
  }
}

/**
 * Get a count of pending jobs
 */
export async function getPendingJobCount(): Promise<number> {
  const supabase = createServerSupabaseClient();
  
  try {
    const { count, error } = await supabase
      .from('background_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
      
    if (error) {
      throw new Error(`Failed to get pending job count: ${error.message}`);
    }
    
    return count || 0;
  } catch (error) {
    logError(`Error getting pending job count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 0;
  }
} 