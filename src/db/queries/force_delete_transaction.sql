-- This script uses a transaction to ensure all operations succeed or fail together
-- Run this in the Supabase SQL Editor

BEGIN;

-- First, disable any triggers that might prevent deletion
SET session_replication_role = 'replica';

-- Delete any bookings related to this course instance
DELETE FROM bookings 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Delete any waitlist entries related to this course instance
DELETE FROM waitlist 
WHERE course_id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Delete the course instance itself
DELETE FROM course_instances 
WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify the course instance is gone
SELECT * FROM course_instances 
WHERE id = 'f376b8cf-32af-4c0d-a96a-14fff8aecd98';

COMMIT; 