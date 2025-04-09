-- Migrate existing data
CREATE TABLE IF NOT EXISTS swish_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    swish_payment_id TEXT UNIQUE,
    swish_callback_url TEXT,
    swish_status TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    phone_number TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    callback_received_at TIMESTAMPTZ,
    callback_data JSONB,
    error_message TEXT,
    UNIQUE(payment_id)
);

-- Create index for faster lookups
CREATE INDEX idx_swish_transactions_payment_id ON swish_transactions(payment_id);
CREATE INDEX idx_swish_transactions_swish_payment_id ON swish_transactions(swish_payment_id);

-- Create async jobs table for handling background tasks
CREATE TABLE IF NOT EXISTS async_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    retries INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    next_retry_at TIMESTAMPTZ,
    error_message TEXT,
    result JSONB,
    -- Add indexes for common queries
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Create index for job processing queries
CREATE INDEX idx_async_jobs_status_next_retry ON async_jobs(status, next_retry_at) 
WHERE status = 'pending';

-- Create stored procedure for idempotent callback handling
CREATE OR REPLACE FUNCTION process_swish_callback(
    p_swish_payment_id TEXT,
    p_status TEXT,
    p_callback_data JSONB
) RETURNS void AS $$
DECLARE
    v_transaction_id UUID;
    v_payment_id UUID;
BEGIN
    -- Get transaction ID and payment ID
    SELECT id, payment_id INTO v_transaction_id, v_payment_id
    FROM swish_transactions
    WHERE swish_payment_id = p_swish_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Swish transaction not found';
    END IF;

    -- Update transaction status
    UPDATE swish_transactions
    SET 
        swish_status = p_status,
        callback_received_at = NOW(),
        callback_data = p_callback_data,
        updated_at = NOW()
    WHERE id = v_transaction_id;

    -- Update payment status
    UPDATE payments
    SET 
        status = p_status,
        updated_at = NOW()
    WHERE id = v_payment_id;

    -- Create async job for post-payment processing if payment was successful
    IF p_status = 'PAID' THEN
        INSERT INTO async_jobs (type, payload)
        VALUES (
            'post_payment_processing',
            jsonb_build_object(
                'payment_id', v_payment_id,
                'swish_transaction_id', v_transaction_id,
                'callback_data', p_callback_data
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to retry failed jobs
CREATE OR REPLACE FUNCTION retry_failed_job(p_job_id UUID) RETURNS void AS $$
BEGIN
    UPDATE async_jobs
    SET 
        status = 'pending',
        retries = retries + 1,
        next_retry_at = NOW() + (INTERVAL '5 minutes' * retries),
        updated_at = NOW()
    WHERE id = p_job_id AND status = 'failed' AND retries < max_retries;
END;
$$ LANGUAGE plpgsql;

-- Create view for monitoring active Swish transactions
CREATE OR REPLACE VIEW active_swish_transactions AS
SELECT 
    st.*,
    p.product_type,
    p.product_id,
    p.user_info,
    p.metadata as payment_metadata
FROM swish_transactions st
JOIN payments p ON p.id = st.payment_id
WHERE st.swish_status NOT IN ('PAID', 'ERROR', 'DECLINED')
ORDER BY st.created_at DESC;

-- Create view for monitoring job status
CREATE OR REPLACE VIEW job_status_summary AS
SELECT 
    type,
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM async_jobs
GROUP BY type, status;

-- Add RLS policies
ALTER TABLE swish_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE async_jobs ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to view their own transactions
CREATE POLICY "Users can view their own transactions" ON swish_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = payment_id
            AND p.user_info->>'email' = auth.jwt()->>'email'
        )
    );

-- Only allow system to modify transactions
CREATE POLICY "System can modify transactions" ON swish_transactions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Only allow system to access jobs
CREATE POLICY "System can access jobs" ON async_jobs
    FOR ALL
    USING (auth.role() = 'service_role'); 