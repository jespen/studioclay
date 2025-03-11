-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  number_of_participants INTEGER NOT NULL DEFAULT 1,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'waiting',
  notified_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT waitlist_number_of_participants_check CHECK (number_of_participants > 0)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS waitlist_course_id_idx ON waitlist(course_id);
CREATE INDEX IF NOT EXISTS waitlist_status_idx ON waitlist(status);
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist(created_at);

-- Add RLS policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Policy for inserting waitlist entries (anyone can add themselves to the waitlist)
CREATE POLICY insert_waitlist ON waitlist
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policy for viewing waitlist entries (only admins can view)
CREATE POLICY select_waitlist ON waitlist
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Policy for updating waitlist entries (only admins can update)
CREATE POLICY update_waitlist ON waitlist
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Policy for deleting waitlist entries (only admins can delete)
CREATE POLICY delete_waitlist ON waitlist
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add comment to table
COMMENT ON TABLE waitlist IS 'Waitlist entries for fully booked courses'; 