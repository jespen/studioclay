-- Functions for direct gift card updates
-- These functions provide more direct control over updates
-- and bypass potential view issues

-- Function to update a gift card's status
CREATE OR REPLACE FUNCTION admin_update_gift_card_status(card_id UUID, new_status TEXT)
RETURNS VOID AS $$
BEGIN
  -- Log the update request (will help with debugging)
  RAISE NOTICE 'Updating gift card % status to %', card_id, new_status;
  
  -- Direct update bypassing potential view issues
  UPDATE gift_cards 
  SET status = new_status
  WHERE id = card_id;
  
  -- Force a commit
  COMMIT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a gift card's payment status
CREATE OR REPLACE FUNCTION admin_update_gift_card_payment(card_id UUID, is_paid BOOLEAN)
RETURNS VOID AS $$
BEGIN
  -- Log the update request
  RAISE NOTICE 'Updating gift card % payment status to %', card_id, is_paid;
  
  -- Direct update bypassing potential view issues
  UPDATE gift_cards 
  SET is_paid = admin_update_gift_card_payment.is_paid
  WHERE id = card_id;
  
  -- Force a commit
  COMMIT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternate function using raw SQL for emergency fixes
CREATE OR REPLACE FUNCTION force_update_gift_card(p_id UUID, p_status TEXT)
RETURNS VOID AS $$
DECLARE
  query TEXT;
BEGIN
  query := 'UPDATE gift_cards SET status = $1 WHERE id = $2';
  EXECUTE query USING p_status, p_id;
  RAISE NOTICE 'Forced update of gift card % to status %', p_id, p_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternate function using raw SQL for emergency payment status fixes
CREATE OR REPLACE FUNCTION force_update_gift_card_payment(p_id UUID, p_is_paid BOOLEAN)
RETURNS VOID AS $$
DECLARE
  query TEXT;
BEGIN
  query := 'UPDATE gift_cards SET is_paid = $1 WHERE id = $2';
  EXECUTE query USING p_is_paid, p_id;
  RAISE NOTICE 'Forced update of gift card % payment status to %', p_id, p_is_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION admin_update_gift_card_status TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_gift_card_payment TO authenticated;
GRANT EXECUTE ON FUNCTION force_update_gift_card TO authenticated;
GRANT EXECUTE ON FUNCTION force_update_gift_card_payment TO authenticated; 