-- Create notification jobs table
CREATE TABLE IF NOT EXISTS notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('payment_confirmation', 'gift_card', 'course_booking', 'art_order')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient job querying
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_next_attempt 
ON notification_jobs (status, next_attempt_at)
WHERE status = 'pending';

-- Create function to create notification job
CREATE OR REPLACE FUNCTION create_notification_job(
  p_job_type TEXT,
  p_payload JSONB
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO notification_jobs (job_type, payload)
  VALUES (p_job_type, p_payload)
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update job status
CREATE OR REPLACE FUNCTION update_notification_job_status(
  p_job_id UUID,
  p_status TEXT,
  p_error TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE notification_jobs
  SET 
    status = p_status,
    updated_at = NOW(),
    payload = 
      CASE 
        WHEN p_error IS NOT NULL 
        THEN jsonb_set(payload, '{error}', to_jsonb(p_error))
        ELSE payload
      END
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to retry failed jobs
CREATE OR REPLACE FUNCTION retry_failed_notification_jobs() RETURNS VOID AS $$
BEGIN
  UPDATE notification_jobs
  SET 
    status = 'pending',
    attempts = attempts + 1,
    next_attempt_at = NOW() + (INTERVAL '5 minutes' * attempts),
    updated_at = NOW()
  WHERE 
    status = 'error' 
    AND attempts < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON notification_jobs
  USING (true)
  WITH CHECK (true);

-- Grant access to authenticated users
GRANT SELECT ON notification_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification_job TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_job_status TO authenticated;
GRANT EXECUTE ON FUNCTION retry_failed_notification_jobs TO authenticated; 