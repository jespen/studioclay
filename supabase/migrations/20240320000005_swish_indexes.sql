-- Indexes for swish_transactions table
CREATE INDEX IF NOT EXISTS idx_swish_transactions_payment_id ON swish_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_swish_transactions_swish_payment_id ON swish_transactions(swish_payment_id);
CREATE INDEX IF NOT EXISTS idx_swish_transactions_status ON swish_transactions(swish_status);
CREATE INDEX IF NOT EXISTS idx_swish_transactions_created_at ON swish_transactions(created_at);

-- Indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_product_type ON payments((metadata->>'product_type'));
CREATE INDEX IF NOT EXISTS idx_payments_product_id ON payments((metadata->>'product_id'));

-- Indexes for bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_course_id ON bookings(course_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Indexes for gift_cards table
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_payment_reference ON gift_cards(payment_reference);
CREATE INDEX IF NOT EXISTS idx_gift_cards_payment_status ON gift_cards(payment_status);

-- Indexes for art_orders table
CREATE INDEX IF NOT EXISTS idx_art_orders_product_id ON art_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_art_orders_order_reference ON art_orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_art_orders_payment_status ON art_orders(payment_status);

-- Indexes for log_entries table
CREATE INDEX IF NOT EXISTS idx_log_entries_level ON log_entries(level);
CREATE INDEX IF NOT EXISTS idx_log_entries_created_at ON log_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_log_entries_metadata ON log_entries USING gin (metadata);

-- Add comments for documentation
COMMENT ON INDEX idx_swish_transactions_payment_id IS 'Optimizes joins between swish_transactions and payments tables';
COMMENT ON INDEX idx_swish_transactions_swish_payment_id IS 'Optimizes lookups by Swish payment ID during callback processing';
COMMENT ON INDEX idx_payments_product_type IS 'Optimizes filtering by product type in metadata';
COMMENT ON INDEX idx_payments_product_id IS 'Optimizes lookups by product ID in metadata';
COMMENT ON INDEX idx_log_entries_metadata IS 'Enables efficient searching in JSON metadata for debugging'; 