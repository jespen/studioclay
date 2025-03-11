-- First, delete any bookings related to this course instance
DELETE FROM bookings 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Delete any waitlist entries related to this course instance
DELETE FROM waitlist 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Delete the course instance itself
DELETE FROM course_instances 
WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- If there's a template that's no longer needed, you can delete it too
-- (Only run this if you want to delete the template as well)
-- DELETE FROM course_templates 
-- WHERE id NOT IN (SELECT DISTINCT template_id FROM course_instances); 