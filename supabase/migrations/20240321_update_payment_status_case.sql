-- Drop existing check constraint if it exists
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

-- Add new check constraint with uppercase values
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('PAID', 'CREATED', 'DECLINED', 'ERROR'));

-- Update existing records to use uppercase
UPDATE bookings SET payment_status = UPPER(payment_status) WHERE payment_status IS NOT NULL; 