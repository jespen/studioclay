-- Gift Cards Table
CREATE TABLE gift_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('digital', 'physical')),
    status VARCHAR(15) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
    remaining_balance DECIMAL(10, 2),
    sender_name VARCHAR(100) NOT NULL,
    sender_email VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(100),
    message TEXT,
    is_emailed BOOLEAN DEFAULT FALSE,
    is_printed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year'),
    
    CONSTRAINT gift_cards_remaining_balance_check CHECK (remaining_balance <= amount)
);

-- Create indexes for faster searching
CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_status ON gift_cards(status);
CREATE INDEX idx_gift_cards_sender_email ON gift_cards(sender_email);

-- Function to generate unique gift card codes
CREATE OR REPLACE FUNCTION generate_gift_card_code() 
RETURNS VARCHAR(20) AS $$
DECLARE
    characters VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    code VARCHAR(20) := '';
    is_unique BOOLEAN := FALSE;
BEGIN
    WHILE NOT is_unique LOOP
        -- Generate a code with format XXXX-XXXX-XXXX (where X is alphanumeric)
        code := '';
        FOR i IN 1..4 LOOP
            code := code || substring(characters FROM floor(random() * 36 + 1)::integer FOR 1);
        END LOOP;
        code := code || '-';
        FOR i IN 1..4 LOOP
            code := code || substring(characters FROM floor(random() * 36 + 1)::integer FOR 1);
        END LOOP;
        code := code || '-';
        FOR i IN 1..4 LOOP
            code := code || substring(characters FROM floor(random() * 36 + 1)::integer FOR 1);
        END LOOP;
        
        -- Check if the code is unique
        IF NOT EXISTS (SELECT 1 FROM gift_cards WHERE gift_cards.code = code) THEN
            is_unique := TRUE;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate unique code before insert
CREATE OR REPLACE FUNCTION set_gift_card_code() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL THEN
        NEW.code := generate_gift_card_code();
    END IF;
    
    IF NEW.remaining_balance IS NULL THEN
        NEW.remaining_balance := NEW.amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_gift_card_code
BEFORE INSERT ON gift_cards
FOR EACH ROW
EXECUTE FUNCTION set_gift_card_code();

-- Add RLS policies for gift_cards table
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

-- Policy for inserting gift cards (anyone can purchase a gift card)
CREATE POLICY insert_gift_cards ON gift_cards
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policy for viewing gift cards (public gift cards are visible to anyone)
CREATE POLICY select_gift_cards ON gift_cards
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Separate policies for updating and deleting gift cards (only admins can do these)
CREATE POLICY update_gift_cards ON gift_cards
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY delete_gift_cards ON gift_cards
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Optionally, create a view for easy admin access
CREATE VIEW active_gift_cards AS
SELECT * FROM gift_cards
WHERE status = 'active' AND expires_at > CURRENT_TIMESTAMP; 