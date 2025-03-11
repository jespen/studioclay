-- First, rename the existing courses table to course_instances
ALTER TABLE IF EXISTS courses RENAME TO course_instances;

-- Add template_id column and foreign key
ALTER TABLE course_instances 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES course_templates(id);

-- Update the table structure to focus on instance-specific data
ALTER TABLE course_instances
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS duration_minutes,
DROP COLUMN IF EXISTS price,
DROP COLUMN IF EXISTS currency,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS image_url,
DROP COLUMN IF EXISTS category_id,
DROP COLUMN IF EXISTS instructor_id;

-- Add indexes
CREATE INDEX IF NOT EXISTS course_instances_template_id_idx ON course_instances(template_id);
CREATE INDEX IF NOT EXISTS course_instances_start_date_idx ON course_instances(start_date);

-- Update RLS policies
DROP POLICY IF EXISTS select_courses ON course_instances;
DROP POLICY IF EXISTS manage_courses ON course_instances;

CREATE POLICY select_course_instances ON course_instances
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY manage_course_instances ON course_instances
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add comment
COMMENT ON TABLE course_instances IS 'Individual course instances created from course templates'; 