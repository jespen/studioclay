-- Insert existing courses into course_templates
INSERT INTO course_templates (
  id,
  title,
  description,
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

-- Update course_instances to link to templates
UPDATE course_instances
SET template_id = courses.id
FROM courses
WHERE course_instances.id = courses.id;

-- Create a sample course template if none exist
INSERT INTO course_templates (
  title,
  description,
  price,
  currency,
  max_participants,
  location,
  is_published
)
SELECT 
  'Keramik för nybörjare',
  'En introduktionskurs i keramik där du lär dig grunderna i drejning och handbygge.',
  1200,
  'SEK',
  8,
  'Studio Clay, Stockholm',
  true
WHERE NOT EXISTS (SELECT 1 FROM course_templates LIMIT 1);

-- Create a sample course instance if none exist
INSERT INTO course_instances (
  title,
  start_date,
  end_date,
  max_participants,
  current_participants,
  is_published,
  template_id
)
SELECT 
  t.title,
  NOW() + interval '1 week',
  NOW() + interval '1 week' + interval '3 hours',
  t.max_participants,
  0,
  true,
  t.id
FROM course_templates t
WHERE NOT EXISTS (SELECT 1 FROM course_instances LIMIT 1)
LIMIT 1; 