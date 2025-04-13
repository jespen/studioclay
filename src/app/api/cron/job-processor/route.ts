import { NextResponse } from 'next/server';
import { processJobs } from '@/lib/jobQueue';
import { logError, logInfo } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

/**
 * This endpoint is designed to be called by Vercel Cron Jobs to process any pending background jobs.
 * It's scheduled to run every 5 minutes to check for and process any pending jobs.
 * 
 * To set up the Vercel Cron job:
 * 1. Add the following to your vercel.json file:
 *    {
 *      "crons": [
 *        {
 *          "path": "/api/cron/job-processor",
 *          "schedule": "*/5 * * * *"
 *        }
 *      ]
 *    }
 * 
 * 2. Deploy to Vercel
 */
export async function GET() {
  const requestId = uuidv4();
  
  try {
    logInfo('Cron job triggered to process background jobs', { requestId });
    
    // Verify the authorization token if needed
    // const authHeader = req.headers.get('Authorization');
    // if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }
    
    // Call the job processing function from jobQueue.ts
    const result = await processJobs(requestId);
    
    if (result) {
      logInfo('Successfully processed jobs from cron job', { requestId });
      return NextResponse.json({ success: true, message: 'Jobs processed successfully' });
    } else {
      logInfo('No jobs to process or job processing returned false', { requestId });
      return NextResponse.json({ success: false, message: 'No jobs processed or processing failed' });
    }
  } catch (error) {
    logError('Error in cron job processing', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error processing jobs' },
      { status: 500 }
    );
  }
}