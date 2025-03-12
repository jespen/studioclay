-- Check if RLS is enabled for gift_cards table
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'gift_cards' AND rowsecurity = false
    ) THEN
        -- Enable RLS on the gift_cards table
        ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS insert_gift_cards ON gift_cards;
DROP POLICY IF EXISTS select_gift_cards ON gift_cards;
DROP POLICY IF EXISTS manage_gift_cards ON gift_cards;
DROP POLICY IF EXISTS update_gift_cards ON gift_cards;
DROP POLICY IF EXISTS delete_gift_cards ON gift_cards;

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

-- Add comment explaining the table purpose
COMMENT ON TABLE gift_cards IS 'Gift cards that can be purchased by customers'; 