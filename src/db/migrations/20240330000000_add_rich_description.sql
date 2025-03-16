-- Add rich_description field to course_templates
ALTER TABLE course_templates
ADD COLUMN IF NOT EXISTS rich_description TEXT; 