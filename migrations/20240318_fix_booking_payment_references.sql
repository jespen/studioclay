-- First, remove any existing foreign key constraints
ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_payment_id_fkey;
ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_booking_id_fkey;

-- Remove the payment_id column from bookings since payments will reference bookings
ALTER TABLE IF EXISTS bookings DROP COLUMN IF EXISTS payment_id;

-- Create status table if it doesn't exist
CREATE TABLE IF NOT EXISTS status (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Insert the statuses we need
INSERT INTO status (name) VALUES
    ('pending'),
    ('confirmed'),
    ('cancelled'),
    ('CREATED'),
    ('PAID'),
    ('DECLINED'),
    ('ERROR')
ON CONFLICT (name) DO NOTHING;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' REFERENCES status(name),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    number_of_participants INTEGER NOT NULL,
    course_id UUID NOT NULL,
    course_date DATE NOT NULL
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'CREATED' REFERENCES status(name),
    payment_method TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_reference TEXT NOT NULL,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT unique_booking_payment UNIQUE (booking_id)
);

-- Handle the status column conversion carefully
ALTER TABLE bookings 
    ALTER COLUMN status DROP DEFAULT,  -- Remove the default first
    ALTER COLUMN status TYPE TEXT USING 
        CASE status 
            WHEN 'pending' THEN 'pending'
            WHEN 'confirmed' THEN 'confirmed'
            WHEN 'cancelled' THEN 'cancelled'
            ELSE 'pending'  -- Default to pending for any unknown status
        END;

-- Set other NOT NULL constraints
ALTER TABLE bookings 
    ALTER COLUMN customer_name SET NOT NULL,
    ALTER COLUMN customer_email SET NOT NULL,
    ALTER COLUMN customer_phone SET NOT NULL,
    ALTER COLUMN number_of_participants SET NOT NULL;

-- Handle the payment status conversion carefully
ALTER TABLE payments
    ALTER COLUMN status DROP DEFAULT,  -- Remove the default first
    ALTER COLUMN status TYPE TEXT USING 
        CASE status 
            WHEN 'CREATED' THEN 'CREATED'
            WHEN 'PAID' THEN 'PAID'
            WHEN 'DECLINED' THEN 'DECLINED'
            WHEN 'ERROR' THEN 'ERROR'
            ELSE 'CREATED'  -- Default to CREATED for any unknown status
        END;

-- Set other payment table constraints
ALTER TABLE payments
    ALTER COLUMN payment_method SET NOT NULL,
    ALTER COLUMN amount SET NOT NULL,
    ALTER COLUMN payment_reference SET NOT NULL,
    ADD CONSTRAINT payments_booking_id_fkey 
        FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) 
        ON DELETE CASCADE;

-- Add unique constraint to ensure one payment per booking
ALTER TABLE payments 
    ADD CONSTRAINT unique_booking_payment 
    UNIQUE (booking_id); 