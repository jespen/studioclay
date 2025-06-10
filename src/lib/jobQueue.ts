import { createServerSupabaseClient } from '@/utils/supabase';
import { logError, logInfo, logDebug, logWarning } from '@/lib/logging';
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
  options: { 
    requestId?: string;
    delay?: number; // fördröjning i millisekunder innan jobbet körs
    waitForCompletion?: boolean; // ny parameter - vänta på att jobbet är klart
  } = {}
): Promise<string | null> {
  const requestId = options.requestId || uuidv4();
  const supabase = createServerSupabaseClient();
  
  try {
    logDebug(`Starting background job creation process`, {
      requestId,
      jobType,
      jobDataKeys: Object.keys(jobData || {}),
      waitForCompletion: options.waitForCompletion || false
    });

    // Validate job data
    if (!jobData) {
      logError(`Invalid job data: jobData is null or undefined`, { requestId });
      return null;
    }

    // Validate job type
    if (!jobType) {
      logError(`Invalid job type: jobType is null or undefined`, { requestId });
      return null;
    }
    
    // KRITISKT: Bevara original payment_reference från jobData
    // Generera aldrig nya referenser här
    if (jobData.paymentReference) {
      logInfo(`Using existing payment reference from job data: ${jobData.paymentReference}`, { 
        requestId, 
        paymentReference: jobData.paymentReference
      });
    }
    
    const newJob: BackgroundJob = {
      id: uuidv4(), // Endast jobb-ID får genereras här
      job_type: jobType,
      job_data: jobData, // Använd exakt samma jobData utan modifikationer
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    logDebug(`Inserting job into database`, {
      requestId, 
      jobId: newJob.id,
      jobType,
      jobStatus: 'pending',
      paymentReference: jobData.paymentReference // Logga för att bekräfta att vi använder samma referens
    });
    
    const { data, error } = await supabase
      .from('background_jobs')
      .insert(newJob)
      .select('id')
      .single();
      
    if (error) {
      logError(`Failed to create background job: ${error.message}`, {
        requestId,
        jobType,
        supabaseError: error
      });
      return null;
    }
    
    logInfo(`Created background job ${data.id} of type ${jobType}`, {
      requestId,
      jobId: data.id,
      jobDataSummary: {
        paymentReference: jobData.paymentReference,
        invoiceNumber: jobData.invoiceNumber,
        productType: jobData.productType,
        userEmail: jobData.userInfo?.email
      }
    });
    
    // Process jobs regardless of environment
    logInfo(`Processing job immediately`, {
      requestId,
      jobId: data.id,
      waitForCompletion: options.waitForCompletion || false
    });
    
    // Vänta på eventuell fördröjning om det är angett
    if (options.delay && options.delay > 0) {
      logDebug(`Delaying job processing by ${options.delay}ms`, {
        requestId,
        jobId: data.id,
        delay: options.delay
      });
      
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
    
    // Försök att använda direkt access till processNextJob
    try {
      // Dynamisk import för att förhindra cirkelberoende
      const { processNextJob } = await import('../app/api/jobs/process/utils');
      
      logInfo(`Directly executing job processor for ${data.id}`, {
        requestId,
        jobId: data.id,
        jobType
      });
      
      const startTime = Date.now();
      const result = await processNextJob(requestId);
      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        logInfo(`Successfully processed job ${result.jobId || 'unknown'} directly in ${processingTime}ms`, {
          requestId,
          jobId: data.id,
          processedJobId: result.jobId,
          processingTimeMs: processingTime
        });
        
        // NYTT: Om vi ska vänta på completion, returnera bara om jobbet faktiskt lyckades
        if (options.waitForCompletion) {
          logInfo(`Job completed successfully and waitForCompletion=true, returning job ID`, {
            requestId,
            jobId: data.id
          });
          return data.id;
        }
      } else {
        logWarning(`Direct job processing failed: ${result.error || 'Unknown error'}`, {
          requestId,
          jobId: data.id
        });
        
        // Om waitForCompletion=true och jobbet misslyckades, returnera null
        if (options.waitForCompletion) {
          logError(`Job failed and waitForCompletion=true, returning null`, {
            requestId,
            jobId: data.id,
            error: result.error
          });
          return null;
        }
        
        // Fallback till HTTP om direkt bearbetning misslyckades
        const httpResult = await processJobs(requestId);
        logInfo(`Fallback HTTP job processing ${httpResult ? 'succeeded' : 'failed'}`, {
          requestId, 
          jobId: data.id
        });
        
        // Om waitForCompletion=true, returnera baserat på HTTP-resultat
        if (options.waitForCompletion) {
          return httpResult ? data.id : null;
        }
      }
    } catch (importError) {
      logWarning(`Could not directly process job, trying HTTP fallback: ${importError instanceof Error ? importError.message : 'Unknown error'}`, {
        requestId,
        jobId: data.id
      });
      
      // Fallback till HTTP om direkt bearbetning inte är tillgänglig
      const processed = await processJobs(requestId);
      logInfo(`Immediate job processing via HTTP ${processed ? 'successful' : 'failed'}`, {
        requestId,
        jobId: data.id
      });
      
      // Om waitForCompletion=true, returnera baserat på HTTP-resultat
      if (options.waitForCompletion) {
        return processed ? data.id : null;
      }
    }
    
    return data.id;
  } catch (error) {
    logError(`Error creating background job: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      requestId,
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

/**
 * Process jobs by calling the job processor
 * This is useful for development and testing
 */
export async function processJobs(requestId: string = uuidv4()): Promise<boolean> {
  try {
    // Determine the base URL - ensure we use localhost in development
    let baseUrl;
    if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:3000';
      logInfo(`Using localhost for job processing in development`, { requestId });
    } else {
      baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    }
    
    // Get the job processor token
    const token = process.env.JOB_PROCESSOR_TOKEN || 'dev-token';
    
    // Call the job processor endpoint
    logInfo(`Calling job processor endpoint via HTTP at ${baseUrl}/api/jobs/process`, { requestId });
    
    // Skapa ett nytt request-objekt för varje anrop för att undvika 'Body has already been read'-fel
    const response = await fetch(`${baseUrl}/api/jobs/process?token=${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      },
      cache: 'no-store' // Förhindra caching
    });
    
    if (!response.ok) {
      // Om det är en JSON-respons, parsa den
      let errorData;
      let errorText;
      
      try {
        // Klona responsen för att undvika Body has already been read
        const responseClone = response.clone();
        try {
          errorData = await responseClone.json();
          logError(`Job processor returned error response: ${JSON.stringify(errorData)}`, { requestId });
        } catch (jsonError) {
          // Om det inte är JSON, använd textinnehållet
          errorText = await response.text();
          logError(`Job processor returned non-JSON response (status ${response.status}): ${errorText.substring(0, 200)}...`, { requestId });
        }
      } catch (readError) {
        logError(`Error reading response: ${readError instanceof Error ? readError.message : 'Unknown error'}`, { requestId });
      }
      
      return false;
    }
    
    // Klona responsen för att säkerställa att vi kan läsa body
    const responseClone = response.clone();
    let result;
    
    try {
      result = await responseClone.json();
    } catch (jsonError) {
      logError(`Error parsing job processor response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`, { requestId });
      return false;
    }
    
    if (result.success) {
      logInfo(`Job processor successfully processed job: ${result.jobId || 'No job ID'}`, { requestId });
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

/**
 * Hämta misslyckade jobb för manuell hantering
 */
export async function getFailedJobs(): Promise<BackgroundJob[]> {
  const supabase = createServerSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new Error(`Failed to get failed jobs: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    logError(`Error getting failed jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
} 