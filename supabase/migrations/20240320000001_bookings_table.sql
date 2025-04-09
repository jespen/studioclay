-- Create bookings table
CREATE TABLE "public"."bookings" (
  "id" UUID PRIMARY KEY,
  "course_id" UUID NOT NULL,
  "booking_reference" TEXT NOT NULL,
  "payment_status" TEXT NOT NULL,
  "payment_id" UUID,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "metadata" JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_course_id ON bookings(course_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Bookings are viewable by everyone" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "Bookings are insertable by everyone" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Bookings are updatable by everyone" ON bookings
  FOR UPDATE USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON bookings TO anon; 