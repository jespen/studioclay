-- Create course_templates table
CREATE TABLE IF NOT EXISTS course_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  max_participants INTEGER,
  location TEXT,
  image_url TEXT,
  category_id UUID REFERENCES categories(id),
  instructor_id UUID REFERENCES instructors(id),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT course_templates_max_participants_check CHECK (max_participants > 0),
  CONSTRAINT course_templates_price_check CHECK (price >= 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS course_templates_category_id_idx ON course_templates(category_id);
CREATE INDEX IF NOT EXISTS course_templates_instructor_id_idx ON course_templates(instructor_id);

-- Add RLS policies
ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;

-- Policy for viewing course templates (anyone can view)
CREATE POLICY select_course_templates ON course_templates
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy for managing course templates (only admins can manage)
CREATE POLICY manage_course_templates ON course_templates
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Add comment
COMMENT ON TABLE course_templates IS 'Course templates that can be used to create course instances'; 