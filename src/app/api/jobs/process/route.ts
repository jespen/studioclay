import { NextRequest, NextResponse } from 'next/server';
import { logWarning, logInfo, logError } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';
import { processNextJob } from './utils';

/**
 * Process background jobs - called by a scheduled job or webhook
 * 
 * Denna endpoint är också tillgänglig i utvecklingsmiljö för att processa bakgrundsjobb
 * direkt utan att förlita sig på schemalagda jobb.
 */
export const GET = async (req: NextRequest) => {
  const requestId = uuidv4();
  
  try {
    // Kontrollera om anropet kommer från utvecklingsmiljön
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Check for a security token (skip in development mode)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const secretToken = process.env.JOB_PROCESSOR_TOKEN;
    
    logInfo(`Job processor triggered via API`, { 
      requestId,
      hasToken: !!token,
      isDevelopment
    });
    
    // Validate token if configured, but allow in development mode
    if (secretToken && token !== secretToken && !isDevelopment) {
      logWarning(`Unauthorized job processor access attempt`, { requestId });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Process the next job using the shared utility function
    logInfo(`Starting job processing`, { requestId });
    const result = await processNextJob(requestId);
    
    logInfo(`Job processing completed with result: ${result.success ? 'success' : 'failure'}`, {
      requestId,
      jobId: result.jobId,
      jobType: result.jobType,
      hasError: !!result.error
    });
    
    // Return appropriate response based on the result
    if (result.success) {
      if (result.jobId) {
        return NextResponse.json({
          success: true,
          jobId: result.jobId,
          jobType: result.jobType,
          message: result.message || "Job processed successfully"
        });
      } else {
        return NextResponse.json({ 
          success: true,
          message: result.message || "No pending jobs" 
        });
      }
    } else {
      return NextResponse.json(
        { 
          success: false, 
          jobId: result.jobId,
          error: result.error || "Unknown error" 
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    logError(`Critical error in job processor endpoint`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error processing jobs'
      },
      { status: 500 }
    );
  }
}; 