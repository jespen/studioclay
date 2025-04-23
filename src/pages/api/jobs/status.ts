import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface BackgroundJob {
  id: string;
  job_type: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Hämta jobbstatistik
    const { data: jobs, error } = await supabase
      .from('background_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Beräkna statistik
    const stats = {
      total: jobs.length,
      completed: jobs.filter((j: BackgroundJob) => j.status === 'completed').length,
      failed: jobs.filter((j: BackgroundJob) => j.status === 'failed').length,
      pending: jobs.filter((j: BackgroundJob) => j.status === 'pending').length,
      byType: jobs.reduce((acc: Record<string, number>, job: BackgroundJob) => {
        acc[job.job_type] = (acc[job.job_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentJobs: jobs.slice(0, 10).map((job: BackgroundJob) => ({
        id: job.id,
        type: job.job_type,
        status: job.status,
        created_at: job.created_at,
        completed_at: job.completed_at,
        error: job.error_message
      }))
    };

    return res.status(200).json({
      message: 'Job status retrieved successfully',
      stats,
      note: 'Jobs are now processed immediately after creation. Failed jobs can be retried using /api/jobs/process'
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return res.status(500).json({ error: 'Failed to fetch job status' });
  }
} 