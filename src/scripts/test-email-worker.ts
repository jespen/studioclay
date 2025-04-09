import { EmailWorker } from '../services/email/emailWorker';
import { createClient } from '@supabase/supabase-js';
import { logInfo, logError } from '@/lib/logging';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createTestJobs() {
  const testJobs = [
    {
      job_type: 'payment_confirmation',
      payload: {
        payment_reference: 'TEST-001',
        amount: 1000,
        recipient_email: 'eva@studioclay.se'
      }
    },
    {
      job_type: 'gift_card',
      payload: {
        code: 'GC-TEST-001',
        amount: 500,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        message: 'Test gift card',
        recipient_email: 'eva@studioclay.se'
      }
    },
    {
      job_type: 'course_booking',
      payload: {
        course_title: 'Test Course',
        start_date: new Date().toISOString(),
        number_of_participants: 1,
        booking_reference: 'BK-TEST-001',
        recipient_email: 'eva@studioclay.se'
      }
    }
  ];

  for (const job of testJobs) {
    try {
      const { data, error } = await supabase.rpc('create_notification_job', {
        p_job_type: job.job_type,
        p_payload: job.payload
      });

      if (error) {
        throw error;
      }

      logInfo(`Created test job: ${job.job_type}`, { job_id: data });
    } catch (error) {
      logError(`Failed to create test job: ${job.job_type}`, error);
    }
  }
}

async function monitorJobs() {
  const interval = setInterval(async () => {
    try {
      const { data: jobs, error } = await supabase
        .from('notification_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      logInfo('Current job status:', jobs);

      // Check if all jobs are completed
      const allCompleted = jobs?.every(job => job.status === 'completed');
      if (allCompleted) {
        logInfo('All jobs completed successfully');
        clearInterval(interval);
        process.exit(0);
      }
    } catch (error) {
      logError('Error monitoring jobs:', error);
    }
  }, 5000); // Check every 5 seconds
}

async function main() {
  try {
    // Create test jobs
    await createTestJobs();

    // Start the email worker
    const worker = EmailWorker.getInstance();
    await worker.start();

    // Monitor job status
    await monitorJobs();
  } catch (error) {
    logError('Error in test script:', error);
    process.exit(1);
  }
}

// Run the test
main(); 