import { NextResponse } from 'next/server';
import { logError, logInfo, logDebug, logWarning } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/utils/supabase';
import { processNextJob } from '@/app/api/jobs/process/utils';
import { NextRequest } from 'next/server';

/**
 * Test endpoint för att manuellt trigga jobbprocessning
 * Används i utvecklingsmiljö för att testa och debugga jobbflöden
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
    logInfo('Manual job processing triggered via test endpoint', { requestId });
    
    // Process the next job using the centralized job processor
    const result = await processNextJob(requestId);
    
    // Kontrollera jobblistan oavsett för att ge information
    const supabase = createServerSupabaseClient();
    const { data: pendingJobs, error: jobsError } = await supabase
      .from('background_jobs')
      .select('id, job_type, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);
      
    const pendingJobCount = pendingJobs?.length || 0;
    
    if (jobsError) {
      logWarning('Error checking pending job list', { 
        requestId, 
        error: jobsError.message,
        processingResult: result 
      });
    } else {
      logInfo(`Found ${pendingJobCount} additional pending jobs`, { requestId });
    }
    
    if (result.success) {
      if (result.jobId) {
        logInfo(`Successfully processed job ${result.jobId}`, { 
          requestId, 
          jobId: result.jobId,
          jobType: result.jobType 
        });
        
        return NextResponse.json({
          success: true,
          message: `Job ${result.jobId} processed successfully`,
          jobId: result.jobId,
          jobType: result.jobType,
          pendingJobs: pendingJobCount > 0 ? pendingJobs : []
        });
      } else {
        return NextResponse.json({
          success: true,
          message: result.message || 'No pending jobs to process',
          pendingJobs: pendingJobCount > 0 ? pendingJobs : []
        });
      }
    } else {
      logError(`Failed to process job`, { 
        requestId, 
        jobId: result.jobId, 
        error: result.error || 'Unknown error' 
      });
      
      return NextResponse.json(
        { 
          success: false, 
          jobId: result.jobId,
          error: result.error || 'Unknown error processing job',
          pendingJobs: pendingJobCount > 0 ? pendingJobs : []
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    logError('Error in test job processing endpoint', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error processing jobs' },
      { status: 500 }
    );
  }
}

/**
 * Test endpoint för att skapa ett testjobb
 * Används i utvecklingsmiljö för att skapa och testa olika jobbtyper
 */
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
    logInfo('Creating sample invoice email job', { requestId });
    
    const supabase = createServerSupabaseClient();
    
    // Create a sample invoice_email job for testing
    const invoiceNumber = `INV-TEST-${Math.floor(Math.random() * 10000)}`;
    const paymentReference = `REF-TEST-${Math.floor(Math.random() * 10000)}`;
    
    const { data, error } = await supabase
      .from('background_jobs')
      .insert({
        id: uuidv4(),
        job_type: 'invoice_email',
        job_data: {
          paymentReference: paymentReference,
          invoiceNumber: invoiceNumber,
          productType: 'course',
          productId: '00000000-0000-0000-0000-000000000000', // Dummy ID
          userInfo: {
            firstName: 'Test',
            lastName: 'User',
            email: 'dev-test@studioclay.se',
            phone: '0701234567'
          },
          invoiceDetails: {
            address: 'Testgatan 1',
            postalCode: '12345',
            city: 'Stockholm'
          },
          amount: 1000
        },
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (error) {
      logError('Error creating sample job', { requestId, error: error.message });
      return NextResponse.json(
        { error: `Failed to create sample job: ${error.message}` },
        { status: 500 }
      );
    }
    
    logInfo('Successfully created sample invoice job', { 
      requestId, 
      jobId: data.id,
      invoiceNumber,
      paymentReference 
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sample invoice job created successfully',
      jobId: data.id,
      invoiceNumber: invoiceNumber,
      paymentReference: paymentReference,
      hint: 'You can now use GET on this endpoint to process the sample job',
      testUrl: '/api/test/process-jobs'
    });
  } catch (error) {
    logError('Error creating sample job', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error creating sample job' },
      { status: 500 }
    );
  }
} 