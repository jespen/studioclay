-- Function to run arbitrary SQL queries (admin only)
CREATE OR REPLACE FUNCTION run_sql_query(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to run this function
  IF (auth.jwt() ->> 'role') != 'admin' THEN
    RAISE EXCEPTION 'Only admins can run SQL queries';
  END IF;
  
  -- Execute the query
  EXECUTE query;
END;
$$; 