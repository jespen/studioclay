-- First, create a backup of the courses table
CREATE TABLE courses_backup AS SELECT * FROM courses;

-- Insert existing courses into course_templates
INSERT INTO course_templates (
  id,
  title,
  description,
  duration_minutes,
  price,
  currency,
  max_participants,
  location,
  image_url,
  category_id,
  instructor_id,
  is_published,
  created_at,
  updated_at
)
SELECT
  id,
  title,
  description,
  duration_minutes,
  price,
  currency,
  max_participants,
  location,
  image_url,
  category_id,
  instructor_id,
  is_published,
  created_at,
  updated_at
FROM courses;

-- Create course instances from existing courses
INSERT INTO course_instances (
  id,
  template_id,
  title,
  start_date,
  end_date,
  max_participants,
  current_participants,
  is_published,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),
  id,
  title,
  start_date,
  end_date,
  max_participants,
  current_participants,
  is_published,
  created_at,
  updated_at
FROM courses;

-- Update bookings to reference the new course instances
UPDATE bookings b
SET course_id = ci.id
FROM course_instances ci
JOIN courses c ON ci.template_id = c.id
WHERE b.course_id = c.id;

-- Update waitlist to reference the new course instances
UPDATE waitlist w
SET course_id = ci.id
FROM course_instances ci
JOIN courses c ON ci.template_id = c.id
WHERE w.course_id = c.id; 