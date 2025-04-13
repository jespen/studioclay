# Background Jobs System

The Studio Clay application uses a background jobs system to handle time-consuming tasks like PDF generation and email sending. This document explains how the system works and provides troubleshooting guidance.

## Overview

The background jobs system consists of several components:

1. **Job Queue** - A database table (`background_jobs`) that stores pending jobs
2. **Job Creator** - Code that creates jobs by inserting records into the job queue
3. **Job Processor** - An API endpoint that processes pending jobs
4. **Job Scheduler** - A mechanism to regularly trigger the job processor

## How It Works

### Job Creation

When a user completes a payment transaction (e.g., invoice for a course), the application:

1. Creates a payment record in the database
2. Creates any necessary product-specific records (e.g., art_orders)
3. Creates a background job to handle PDF generation and email sending

Example job creation code:

```typescript
const jobId = await createBackgroundJob('invoice_email', {
  paymentReference,
  invoiceNumber,
  productType,
  productId,
  userInfo,
  invoiceDetails,
  amount
});
```

### Job Processing

The job processor runs either:
- Automatically every 5 minutes via Vercel cron jobs (in production)
- Immediately after job creation (in development mode)
- Manually via the test endpoint (for troubleshooting)

When processing a job, the system:
1. Fetches the oldest pending job from the queue
2. Updates the job status to "processing"
3. Executes the appropriate code based on the job type
4. Updates the job status to "completed" or "failed"

## Supported Job Types

- `invoice_email` - Generates invoice PDFs and sends confirmation emails
- `gift_card_delivery` - Generates gift card PDFs and sends emails
- `order_confirmation` - Sends order confirmation emails for art products

## Deployment Requirements

1. **Vercel Cron Job** - Configured in vercel.json to run every 5 minutes
2. **Storage Buckets** - Two required buckets in Supabase:
   - `invoices` - For storing invoice PDFs
   - `giftcards` - For storing gift card PDFs

## Testing and Troubleshooting

### Development Environment

In development, background jobs are processed immediately after creation. If you want to manually test:

1. Create a test job:
   ```
   POST /api/test/process-jobs
   ```

2. Process pending jobs:
   ```
   GET /api/test/process-jobs
   ```

3. Check and setup storage buckets:
   ```
   GET /api/test/setup-storage
   ```

### Production Environment

In production, the jobs are processed by the Vercel cron job every 5 minutes. You can monitor jobs in the database by checking the `background_jobs` table.

### Common Issues

1. **Jobs not being processed**:
   - Verify the Vercel cron job is configured correctly in vercel.json
   - Check that the job processor endpoint is working by calling it manually
   - Check the Vercel logs for any errors in the cron job execution

2. **PDF generation failing**:
   - Ensure the required storage buckets exist (use the setup-storage endpoint)
   - Check logs for specific errors in PDF generation
   - Verify jsPDF is working correctly on the server

3. **Email sending failing**:
   - Check email configuration settings (SMTP server, credentials)
   - Verify the email templates are properly formatted
   - Look for timeout or connection errors in the logs

## Monitoring

Background jobs can be monitored through:

1. The application logs - Check for entries with job-related information
2. Directly querying the database - Count pending, processing, and failed jobs
3. Job stats endpoint - Available at `/api/test/job-stats` (development only)

## Future Improvements

1. Implement job retry capabilities for failed jobs
2. Add a job dashboard for administrators
3. Enhance job logging and error reporting
4. Add support for more complex job types and dependencies 