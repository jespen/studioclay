-- Create pending_bookings table
CREATE TABLE pending_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  number_of_participants INTEGER,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 