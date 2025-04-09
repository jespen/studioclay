import { createClient } from '@supabase/supabase-js';
import { logDebug, logError, logInfo } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types for notification jobs
interface NotificationJob {
  id: string;
  job_type: 'payment_confirmation' | 'gift_card' | 'course_booking' | 'art_order';
  status: 'pending' | 'processing' | 'completed' | 'error';
  payload: any;
  attempts: number;
  next_attempt_at: string;
  created_at: string;
  updated_at: string;
}

// Email templates
const EMAIL_TEMPLATES = {
  payment_confirmation: (data: any) => ({
    subject: 'Betalningsbekräftelse från Studio Clay',
    html: `
      <h1>Tack för din betalning!</h1>
      <p>Din betalning har mottagits och behandlats.</p>
      <p>Betalningsreferens: ${data.payment_reference}</p>
      <p>Belopp: ${data.amount} SEK</p>
    `
  }),
  gift_card: (data: any) => ({
    subject: 'Ditt presentkort från Studio Clay',
    html: `
      <h1>Grattis till ditt presentkort!</h1>
      <p>Presentkortskod: ${data.code}</p>
      <p>Belopp: ${data.amount} SEK</p>
      <p>Giltigt till: ${new Date(data.expires_at).toLocaleDateString()}</p>
      ${data.message ? `<p>Meddelande: ${data.message}</p>` : ''}
    `
  }),
  course_booking: (data: any) => ({
    subject: 'Din kursbokning hos Studio Clay',
    html: `
      <h1>Tack för din kursbokning!</h1>
      <p>Kurs: ${data.course_title}</p>
      <p>Datum: ${new Date(data.start_date).toLocaleDateString()}</p>
      <p>Antal deltagare: ${data.number_of_participants}</p>
      <p>Bokningsreferens: ${data.booking_reference}</p>
    `
  }),
  art_order: (data: any) => ({
    subject: 'Din beställning från Studio Clay',
    html: `
      <h1>Tack för din beställning!</h1>
      <p>Produkt: ${data.product_title}</p>
      <p>Ordernummer: ${data.order_reference}</p>
      <p>Upphämtning: Studio Clay, Norrtullsgatan 65</p>
    `
  })
};

export class EmailWorker {
  private static instance: EmailWorker;
  private isRunning: boolean = false;
  private pollInterval: number = 5000; // 5 seconds
  private maxRetries: number = 3;
  private supabase;

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  public static getInstance(): EmailWorker {
    if (!EmailWorker.instance) {
      EmailWorker.instance = new EmailWorker();
    }
    return EmailWorker.instance;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logInfo('EmailWorker is already running');
      return;
    }

    this.isRunning = true;
    logInfo('Starting EmailWorker');
    this.processJobs();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    logInfo('Stopping EmailWorker');
  }

  private async processJobs(): Promise<void> {
    while (this.isRunning) {
      try {
        // Fetch pending jobs
        const { data: jobs, error } = await this.supabase
          .from('notification_jobs')
          .select('*')
          .eq('status', 'pending')
          .lte('next_attempt_at', new Date().toISOString())
          .order('created_at', { ascending: true })
          .limit(5);

        if (error) {
          throw error;
        }

        if (jobs && jobs.length > 0) {
          logInfo(`Processing ${jobs.length} jobs`);
          
          for (const job of jobs) {
            await this.processJob(job);
          }
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      } catch (error) {
        logError('Error in job processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }
  }

  private async processJob(job: NotificationJob): Promise<void> {
    logInfo(`Processing job ${job.id}`, { job_type: job.job_type });

    try {
      // Mark job as processing
      await this.updateJobStatus(job.id, 'processing');

      // Process based on job type
      switch (job.job_type) {
        case 'payment_confirmation':
          await this.sendPaymentConfirmation(job);
          break;
        case 'gift_card':
          await this.sendGiftCardEmail(job);
          break;
        case 'course_booking':
          await this.sendCourseBookingConfirmation(job);
          break;
        case 'art_order':
          await this.sendArtOrderConfirmation(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Mark job as completed
      await this.updateJobStatus(job.id, 'completed');
      logInfo(`Successfully completed job ${job.id}`);

    } catch (error) {
      logError(`Error processing job ${job.id}:`, error);
      
      if (job.attempts >= this.maxRetries) {
        await this.updateJobStatus(job.id, 'error', error instanceof Error ? error.message : 'Unknown error');
        logError(`Job ${job.id} failed permanently after ${job.attempts} attempts`);
      } else {
        // Calculate next retry with exponential backoff
        const nextAttempt = new Date();
        nextAttempt.setMinutes(nextAttempt.getMinutes() + Math.pow(2, job.attempts));
        
        await this.supabase
          .from('notification_jobs')
          .update({
            status: 'pending',
            attempts: job.attempts + 1,
            next_attempt_at: nextAttempt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        logInfo(`Scheduled retry for job ${job.id}`, { 
          nextAttempt: nextAttempt.toISOString(),
          attempt: job.attempts + 1
        });
      }
    }
  }

  private async updateJobStatus(
    jobId: string, 
    status: NotificationJob['status'], 
    error?: string
  ): Promise<void> {
    const { error: updateError } = await this.supabase.rpc(
      'update_notification_job_status',
      { 
        p_job_id: jobId, 
        p_status: status,
        p_error: error
      }
    );

    if (updateError) {
      logError(`Failed to update job ${jobId} status:`, updateError);
      throw updateError;
    }
  }

  private async sendPaymentConfirmation(job: NotificationJob): Promise<void> {
    const { payment_reference, amount, recipient_email } = job.payload;
    
    await this.sendEmail({
      to: recipient_email,
      subject: 'Betalningsbekräftelse - Studio Clay',
      template: 'payment_confirmation',
      data: {
        payment_reference,
        amount: new Intl.NumberFormat('sv-SE', { 
          style: 'currency', 
          currency: 'SEK' 
        }).format(amount)
      }
    });
  }

  private async sendGiftCardEmail(job: NotificationJob): Promise<void> {
    const { code, amount, expires_at, message, recipient_email } = job.payload;
    
    await this.sendEmail({
      to: recipient_email,
      subject: 'Ditt presentkort från Studio Clay',
      template: 'gift_card',
      data: {
        code,
        amount: new Intl.NumberFormat('sv-SE', { 
          style: 'currency', 
          currency: 'SEK' 
        }).format(amount),
        expires_at: new Date(expires_at).toLocaleDateString('sv-SE'),
        message
      }
    });
  }

  private async sendCourseBookingConfirmation(job: NotificationJob): Promise<void> {
    const { 
      course_title, 
      start_date, 
      number_of_participants,
      booking_reference,
      recipient_email 
    } = job.payload;
    
    await this.sendEmail({
      to: recipient_email,
      subject: 'Bokningsbekräftelse - Studio Clay',
      template: 'course_booking',
      data: {
        course_title,
        start_date: new Date(start_date).toLocaleDateString('sv-SE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        number_of_participants,
        booking_reference
      }
    });
  }

  private async sendArtOrderConfirmation(job: NotificationJob): Promise<void> {
    const { order_reference, product_title, recipient_email } = job.payload;
    
    await this.sendEmail({
      to: recipient_email,
      subject: 'Orderbekräftelse - Studio Clay',
      template: 'art_order',
      data: {
        order_reference,
        product_title
      }
    });
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    template: string;
    data: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await this.supabase.functions.invoke('send-email', {
        body: {
          to: params.to,
          subject: params.subject,
          template: params.template,
          data: params.data
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      logError('Failed to send email:', error);
      throw new Error('Failed to send email: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
} 