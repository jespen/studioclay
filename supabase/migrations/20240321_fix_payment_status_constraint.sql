-- First, drop the existing constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

-- Then add the new constraint with uppercase values
ALTER TABLE bookings 
  ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('PAID', 'CREATED', 'DECLINED', 'ERROR')); 