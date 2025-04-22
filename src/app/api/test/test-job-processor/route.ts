import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logInfo, logError, logDebug } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test endpoint to diagnose issues with job processing
 * This will manually trigger the job processor and log details
 */
export async function GET() {
  const requestId = uuidv4();
  
  try {
    logInfo('Testing job processor with manual trigger', { requestId });
    
    // Get the environment variables
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS,
      EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD, // Check both variants
      EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST,
      EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT,
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production'
    };
    
    logInfo('Environment variables check', { 
      requestId,
      envVars
    });
    
    const supabase = createServerSupabaseClient();
    
    // 1. Check for pending jobs
    const { data: pendingJobs, error: jobsError } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
      
    if (jobsError) {
      logError('Failed to check for pending jobs', {
        requestId,
        error: jobsError.message
      });
      
      return NextResponse.json({
        success: false,
        error: 'Failed to check for pending jobs',
        message: jobsError.message
      }, { status: 500 });
    }
    
    // 2. Log the pending jobs count
    logInfo(`Found ${pendingJobs?.length || 0} pending jobs`, { requestId });
    
    // 3. Import and call the job processor directly
    logInfo('Attempting to import processNextJob function', { requestId });
    
    try {
      const { processNextJob } = await import('@/app/api/jobs/process/utils');
      
      if (!processNextJob) {
        logError('processNextJob function not found in imports', { requestId });
        throw new Error('processNextJob function not found in imports');
      }
      
      logInfo('Successfully imported processNextJob function', { requestId });
      
      // 4. Process the next job
      logInfo('Calling processNextJob function directly', { requestId });
      const result = await processNextJob(requestId);
      
      logInfo('Job processor result', { 
        requestId,
        result
      });
      
      // 5. Return result
      return NextResponse.json({
        success: true,
        message: 'Job processor test completed',
        result,
        pendingJobsCount: pendingJobs?.length || 0,
        environment: envVars
      });
      
    } catch (importError) {
      logError('Error importing or running processNextJob', {
        requestId,
        error: importError instanceof Error ? importError.message : 'Unknown error',
        stack: importError instanceof Error ? importError.stack : undefined
      });
      
      return NextResponse.json({
        success: false,
        error: 'Error importing or running processNextJob',
        message: importError instanceof Error ? importError.message : 'Unknown error',
        environment: envVars
      }, { status: 500 });
    }
  } catch (error) {
    logError('Error in job processor test', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Internal server error in job processor test' },
      { status: 500 }
    );
  }
} 