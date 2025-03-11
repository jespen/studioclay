-- This query will search for the problematic course ID in all tables
-- Run this in the Supabase SQL Editor to find any references to the course

-- Check course_instances table
SELECT 'course_instances' as table_name, count(*) as count 
FROM course_instances 
WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Check bookings table
SELECT 'bookings' as table_name, count(*) as count 
FROM bookings 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Check waitlist table
SELECT 'waitlist' as table_name, count(*) as count 
FROM waitlist 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Check if there's a template associated with this instance
SELECT 'course_templates' as table_name, count(*) as count 
FROM course_templates 
WHERE id IN (
  SELECT template_id FROM course_instances 
  WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98'
);

-- Check for any other tables that might reference this ID
-- This query searches all tables for columns that might contain this UUID
SELECT 
  table_schema, 
  table_name, 
  column_name
FROM 
  information_schema.columns
WHERE 
  data_type = 'uuid' AND
  table_schema = 'public';

-- You can then manually check each of these tables with a query like:
-- SELECT * FROM [table_name] WHERE [column_name] = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98'; 