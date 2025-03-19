-- Add booking_id column to payments table
ALTER TABLE payments ADD COLUMN booking_id UUID REFERENCES bookings(id);

-- Create an index for better query performance
CREATE INDEX idx_payments_booking_id ON payments(booking_id);

-- Add a unique constraint to ensure one payment per booking
ALTER TABLE payments ADD CONSTRAINT unique_booking_payment UNIQUE (booking_id); 