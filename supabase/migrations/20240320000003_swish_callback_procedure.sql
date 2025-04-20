-- Create enum for Swish status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE swish_status AS ENUM ('CREATED', 'PAID', 'DECLINED', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create function to process Swish callbacks
CREATE OR REPLACE FUNCTION process_swish_callback(
    p_swish_payment_id TEXT,
    p_status TEXT,
    p_callback_data JSONB
) RETURNS void AS $$
DECLARE
    v_transaction_id UUID;
    v_payment_id UUID;
    v_product_type TEXT;
    v_product_id TEXT;
    v_user_info JSONB;
    v_amount DECIMAL;
    v_booking_reference TEXT;
BEGIN
    -- Log callback processing start
    INSERT INTO log_entries (level, message, metadata)
    VALUES ('INFO', 'Processing Swish callback', jsonb_build_object(
        'swish_payment_id', p_swish_payment_id,
        'status', p_status,
        'timestamp', NOW()
    ));

    -- Get transaction and related payment info
    SELECT 
        st.id,
        st.payment_id,
        p.metadata->>'product_type',
        p.metadata->>'product_id',
        p.metadata->'user_info',
        st.amount
    INTO 
        v_transaction_id,
        v_payment_id,
        v_product_type,
        v_product_id,
        v_user_info,
        v_amount
    FROM swish_transactions st
    JOIN payments p ON p.id = st.payment_id
    WHERE st.swish_payment_id = p_swish_payment_id;

    IF v_transaction_id IS NULL THEN
        RAISE EXCEPTION 'Transaction not found for Swish payment ID: %', p_swish_payment_id;
    END IF;

    -- Start transaction
    BEGIN
        -- Update Swish transaction status
        UPDATE swish_transactions
        SET 
            swish_status = p_status::swish_status,
            callback_data = p_callback_data,
            updated_at = NOW()
        WHERE id = v_transaction_id;

        -- Update payment status
        UPDATE payments
        SET 
            status = p_status,
            updated_at = NOW()
        WHERE id = v_payment_id;

        -- If payment is successful (PAID), process based on product type
        IF p_status = 'PAID' THEN
            CASE v_product_type
                WHEN 'course' THEN
                    -- Generate booking reference
                    v_booking_reference := 'SC-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || 
                                        LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
                    
                    -- Create course booking
                    INSERT INTO bookings (
                        booking_reference,
                        course_id,
                        customer_name,
                        customer_email,
                        customer_phone,
                        number_of_participants,
                        booking_date,
                        status,
                        payment_status,
                        payment_method,
                        total_price,
                        currency
                    ) VALUES (
                        v_booking_reference,
                        v_product_id,
                        v_user_info->>'firstName' || ' ' || v_user_info->>'lastName',
                        v_user_info->>'email',
                        v_user_info->>'phone',
                        (v_user_info->>'numberOfParticipants')::INTEGER,
                        NOW(),
                        'confirmed',
                        'PAID',
                        'swish',
                        v_amount,
                        'SEK'
                    );

                    -- Update course participants count
                    UPDATE course_instances
                    SET current_participants = COALESCE(current_participants, 0) + 
                                            (v_user_info->>'numberOfParticipants')::INTEGER
                    WHERE id = v_product_id;

                WHEN 'gift_card' THEN
                    -- Create gift card
                    INSERT INTO gift_cards (
                        code,
                        amount,
                        type,
                        sender_name,
                        sender_email,
                        sender_phone,
                        recipient_name,
                        recipient_email,
                        message,
                        payment_reference,
                        payment_status,
                        expires_at,
                        is_paid,
                        payment_method
                    ) VALUES (
                        'GC-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || 
                        LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0'),
                        v_amount,
                        COALESCE(p_callback_data->'metadata'->'item_details'->>'type', 'digital'),
                        v_user_info->>'firstName' || ' ' || v_user_info->>'lastName',
                        v_user_info->>'email',
                        v_user_info->>'phone',
                        p_callback_data->'metadata'->'item_details'->>'recipientName',
                        p_callback_data->'metadata'->'item_details'->>'recipientEmail',
                        p_callback_data->'metadata'->'item_details'->>'message',
                        p_swish_payment_id,
                        'PAID',
                        NOW() + INTERVAL '1 year',
                        true,
                        'swish'
                    );

                WHEN 'art_product' THEN
                    -- Create art order
                    INSERT INTO art_orders (
                        order_reference,
                        product_id,
                        customer_name,
                        customer_email,
                        customer_phone,
                        order_date,
                        status,
                        payment_status,
                        payment_method,
                        total_price,
                        currency
                    ) VALUES (
                        'SP-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || 
                        LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0'),
                        v_product_id,
                        v_user_info->>'firstName' || ' ' || v_user_info->>'lastName',
                        v_user_info->>'email',
                        v_user_info->>'phone',
                        NOW(),
                        'pending',
                        'PAID',
                        'swish',
                        v_amount,
                        'SEK'
                    );

                    -- Update product stock
                    UPDATE products
                    SET stock_quantity = stock_quantity - 1, 
                        in_stock = CASE WHEN stock_quantity - 1 > 0 THEN true ELSE false END
                    WHERE id = v_product_id AND stock_quantity > 0;
            END CASE;
        END IF;

        -- Log successful processing
        INSERT INTO log_entries (level, message, metadata)
        VALUES ('INFO', 'Successfully processed Swish callback', jsonb_build_object(
            'swish_payment_id', p_swish_payment_id,
            'status', p_status,
            'product_type', v_product_type,
            'timestamp', NOW()
        ));

    EXCEPTION WHEN OTHERS THEN
        -- Log error and re-raise
        INSERT INTO log_entries (level, message, metadata)
        VALUES ('ERROR', 'Error processing Swish callback', jsonb_build_object(
            'swish_payment_id', p_swish_payment_id,
            'error', SQLERRM,
            'timestamp', NOW()
        ));
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql; 