-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create art_orders table
CREATE TABLE art_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    product_id UUID NOT NULL REFERENCES products(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'CREATED',
    payment_method TEXT NOT NULL,
    order_reference TEXT NOT NULL,
    invoice_number TEXT,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SEK',
    metadata JSONB,
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('CREATED', 'PAID', 'DECLINED', 'ERROR')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'picked_up', 'cancelled'))
);

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON art_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at(); 