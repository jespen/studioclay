-- Function to update all references to a course to NULL
CREATE OR REPLACE FUNCTION update_course_references_to_null(course_id UUID)
RETURNS void AS $$
BEGIN
  -- Update bookings
  UPDATE bookings SET course_id = NULL WHERE course_id = course_id;
  
  -- Update waitlist
  UPDATE waitlist SET course_id = NULL WHERE course_id = course_id;
  
  -- Add any other tables that might reference course_id here
END;
$$ LANGUAGE plpgsql;

-- Function to force delete a course using raw SQL
CREATE OR REPLACE FUNCTION force_delete_course(course_id UUID)
RETURNS void AS $$
BEGIN
  -- First try to delete any related records
  EXECUTE 'DELETE FROM bookings WHERE course_id = $1' USING course_id;
  EXECUTE 'DELETE FROM waitlist WHERE course_id = $1' USING course_id;
  
  -- Then delete the course instance
  EXECUTE 'DELETE FROM course_instances WHERE id = $1' USING course_id;
  
  -- If needed, you can add more statements here
END;
$$ LANGUAGE plpgsql; 