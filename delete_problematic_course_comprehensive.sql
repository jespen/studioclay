-- First, let's check if the course instance exists
SELECT * FROM course_instances WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Check for any related bookings
SELECT * FROM bookings WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Check for any related waitlist entries
SELECT * FROM waitlist WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Delete any bookings related to this course instance
DELETE FROM bookings 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Delete any waitlist entries related to this course instance
DELETE FROM waitlist 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Force delete the course instance with CASCADE option (if your database supports it)
DELETE FROM course_instances 
WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- If the above doesn't work, try to identify the template_id first
SELECT template_id FROM course_instances 
WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Try a different approach - update any foreign key references to null first
UPDATE bookings SET course_id = NULL 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

UPDATE waitlist SET course_id = NULL 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Now try deleting again
DELETE FROM course_instances 
WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Verify the course instance is gone
SELECT * FROM course_instances WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98'; 