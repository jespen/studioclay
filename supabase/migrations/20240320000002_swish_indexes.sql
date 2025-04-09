-- Create indexes for swish_transactions
CREATE INDEX IF NOT EXISTS idx_swish_transactions_payment_reference ON swish_transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_swish_transactions_status ON swish_transactions(status);
CREATE INDEX IF NOT EXISTS idx_swish_transactions_created_at ON swish_transactions(created_at);

-- Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_swish_payment_id ON payments(swish_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_payment_id ON bookings(payment_id);

-- Create indexes for log_entries
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_log_entries_level ON log_entries(level);
CREATE INDEX IF NOT EXISTS idx_log_entries_context ON log_entries(context); 