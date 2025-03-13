-- Rename courses table to course_instances
ALTER TABLE courses RENAME TO course_instances;

-- Add template_id column and foreign key
ALTER TABLE course_instances 
  ADD COLUMN template_id UUID REFERENCES course_templates(id);

-- Drop columns that are now in templates
ALTER TABLE course_instances
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS image_url,
  DROP COLUMN IF EXISTS category_id,
  DROP COLUMN IF EXISTS instructor_id;

-- Add indexes
CREATE INDEX IF NOT EXISTS course_instances_template_id_idx ON course_instances(template_id);

-- Update RLS policies
DROP POLICY IF EXISTS select_courses ON course_instances;
DROP POLICY IF EXISTS manage_courses ON course_instances;

ALTER TABLE course_instances ENABLE ROW LEVEL SECURITY;

-- Policy for viewing course instances (anyone can view)
CREATE POLICY select_course_instances ON course_instances
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy for managing course instances (only admins can manage)
CREATE POLICY manage_course_instances ON course_instances
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add comment
COMMENT ON TABLE course_instances IS 'Individual course instances created from course templates'; 