-- Create notification_jobs table for handling async notifications
CREATE TABLE IF NOT EXISTS notification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    last_error JSONB
);

-- Create index for notification processing
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_next_attempt 
ON notification_jobs(status, next_attempt_at) 
WHERE status = 'pending';

-- Function to create notification job
CREATE OR REPLACE FUNCTION create_payment_notification_job()
RETURNS TRIGGER AS $$
DECLARE
    v_product_type TEXT;
    v_user_info JSONB;
    v_notification_type TEXT;
    v_template_data JSONB;
BEGIN
    -- Only process PAID status changes
    IF NEW.status = 'PAID' AND (OLD.status IS NULL OR OLD.status != 'PAID') THEN
        -- Get product type and user info from metadata
        v_product_type := NEW.metadata->>'product_type';
        v_user_info := NEW.metadata->'user_info';
        
        -- Set notification type based on product
        CASE v_product_type
            WHEN 'course' THEN
                v_notification_type := 'course_booking_confirmation';
                -- Get course details
                SELECT jsonb_build_object(
                    'course_title', title,
                    'start_date', start_date,
                    'description', description
                )
                INTO v_template_data
                FROM course_instances
                WHERE id = (NEW.metadata->>'product_id')::UUID;
                
            WHEN 'gift_card' THEN
                v_notification_type := 'gift_card_confirmation';
                -- Get gift card details
                SELECT jsonb_build_object(
                    'code', code,
                    'amount', amount,
                    'recipient_name', recipient_name,
                    'recipient_email', recipient_email,
                    'message', message,
                    'expires_at', expires_at
                )
                INTO v_template_data
                FROM gift_cards
                WHERE payment_reference = NEW.payment_reference;
                
            WHEN 'art_product' THEN
                v_notification_type := 'art_order_confirmation';
                -- Get product details
                SELECT jsonb_build_object(
                    'title', title,
                    'price', price,
                    'description', description
                )
                INTO v_template_data
                FROM products
                WHERE id = (NEW.metadata->>'product_id')::UUID;
        END CASE;

        -- Create notification job
        INSERT INTO notification_jobs (
            job_type,
            status,
            payload
        ) VALUES (
            v_notification_type,
            'pending',
            jsonb_build_object(
                'payment_id', NEW.id,
                'payment_reference', NEW.payment_reference,
                'amount', NEW.amount,
                'currency', NEW.currency,
                'user_info', v_user_info,
                'product_type', v_product_type,
                'template_data', v_template_data,
                'created_at', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment notifications
DROP TRIGGER IF EXISTS trigger_payment_notification ON payments;
CREATE TRIGGER trigger_payment_notification
    AFTER UPDATE OF status
    ON payments
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_notification_job();

-- Function to handle notification retries
CREATE OR REPLACE FUNCTION update_notification_retry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'error' AND NEW.attempts < NEW.max_attempts THEN
        NEW.status := 'pending';
        NEW.next_attempt_at := NOW() + (INTERVAL '5 minutes' * NEW.attempts);
        NEW.attempts := NEW.attempts + 1;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notification retries
DROP TRIGGER IF EXISTS trigger_notification_retry ON notification_jobs;
CREATE TRIGGER trigger_notification_retry
    BEFORE UPDATE OF status
    ON notification_jobs
    FOR EACH ROW
    WHEN (NEW.status = 'error')
    EXECUTE FUNCTION update_notification_retry();

-- Add comments for documentation
COMMENT ON TABLE notification_jobs IS 'Queue for handling asynchronous email notifications';
COMMENT ON COLUMN notification_jobs.job_type IS 'Type of notification (course_booking_confirmation, gift_card_confirmation, art_order_confirmation)';
COMMENT ON COLUMN notification_jobs.payload IS 'Data needed for generating and sending the notification';
COMMENT ON COLUMN notification_jobs.next_attempt_at IS 'When to try sending the notification again after a failure'; 