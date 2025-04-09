-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL NOT NULL,
  payment_reference TEXT NOT NULL, -- Vår interna referens (SC-XXXXXX-XXX)
  swish_payment_id TEXT, -- ID från Swish (endast för Swish-betalningar)
  swish_callback_url TEXT,
  phone_number TEXT,
  status TEXT NOT NULL, -- 'CREATED', 'PAID', 'DECLINED', 'ERROR'
  error_message TEXT, -- Felmeddelande om betalningen misslyckades
  created_at TIMESTAMPTZ DEFAULT NOW(), -- Skapandetidpunkt
  updated_at TIMESTAMPTZ DEFAULT NOW(), -- Tidpunkt för senaste uppdatering (används som betalningsdatum för PAID-status)
  payment_method TEXT NOT NULL, -- 'swish', 'invoice'
  booking_id UUID, -- FK till bookings.id
  course_id UUID, -- FK till course_instances.id
  user_info JSONB, -- Lagrar användarinfo som JSON
  product_type TEXT NOT NULL, -- 'course', 'gift_card', 'art_product'
  product_id UUID NOT NULL, -- ID för produkten (course_instance, gift_card eller product)
  currency TEXT DEFAULT 'SEK',
  metadata JSONB -- Ytterligare data, callbacks, betalningsdatum från Swish, etc.
);

-- Create index for payment reference lookups
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(payment_reference);

-- Create index for Swish payment ID lookups
CREATE INDEX IF NOT EXISTS idx_payments_swish_id ON payments(swish_payment_id);

-- Add RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to view their own payments
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT
    USING (
        user_info->>'email' = auth.jwt()->>'email'
    );

-- Only allow system to modify payments
CREATE POLICY "System can modify payments" ON payments
    FOR ALL
    USING (auth.role() = 'service_role'); 