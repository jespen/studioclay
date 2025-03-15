-- Add status column to course_instances table
ALTER TABLE course_instances 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled'
CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'));

-- Create index for status column
CREATE INDEX IF NOT EXISTS course_instances_status_idx ON course_instances(status);

-- Update comment
COMMENT ON COLUMN course_instances.status IS 'Status of the course instance: scheduled, active, completed, or cancelled'; 