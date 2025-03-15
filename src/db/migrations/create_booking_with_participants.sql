-- Create a stored function to create a booking and update participant count in a single transaction
CREATE OR REPLACE FUNCTION create_booking_with_participants(
  booking_data JSONB,
  participant_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  inserted_booking JSONB;
  current_count INTEGER;
BEGIN
  -- Start transaction
  BEGIN
    -- Insert the booking
    INSERT INTO bookings (
      course_id,
      customer_name,
      customer_email,
      customer_phone,
      number_of_participants,
      booking_date,
      status,
      payment_status,
      message,
      created_at,
      updated_at
    ) VALUES (
      (booking_data->>'course_id')::UUID,
      booking_data->>'customer_name',
      booking_data->>'customer_email',
      booking_data->>'customer_phone',
      (booking_data->>'number_of_participants')::INTEGER,
      (booking_data->>'booking_date')::TIMESTAMPTZ,
      booking_data->>'status',
      booking_data->>'payment_status',
      booking_data->>'message',
      NOW(),
      NOW()
    )
    RETURNING to_jsonb(bookings.*) INTO inserted_booking;
    
    -- Only update participant count for confirmed/pending bookings
    IF (booking_data->>'status' IS NULL OR 
        booking_data->>'status' = 'confirmed' OR 
        booking_data->>'status' = 'pending') THEN
      
      -- Get current participant count
      SELECT current_participants 
      INTO current_count
      FROM course_instances 
      WHERE id = (booking_data->>'course_id')::UUID;
      
      -- Update the course's participant count
      UPDATE course_instances
      SET 
        current_participants = current_count + participant_count,
        updated_at = NOW()
      WHERE id = (booking_data->>'course_id')::UUID;
    END IF;
    
    -- Return the inserted booking
    RETURN inserted_booking;
  END;
END;
$$ LANGUAGE plpgsql;

-- Comment describing the function
COMMENT ON FUNCTION create_booking_with_participants(JSONB, INTEGER) IS 
  'Creates a booking and updates the course participant count in a single transaction'; 