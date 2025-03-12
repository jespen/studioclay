-- Enable RLS on the gift_cards table
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS insert_gift_cards ON gift_cards;
DROP POLICY IF EXISTS select_gift_cards ON gift_cards;
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

-- Policy for updating gift cards (only admins can update)
CREATE POLICY update_gift_cards ON gift_cards
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Policy for deleting gift cards (only admins can delete)
CREATE POLICY delete_gift_cards ON gift_cards
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin'); 