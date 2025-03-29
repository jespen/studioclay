-- Drop existing check constraint if it exists
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_product_type_check;

-- Add new check constraint with art_product
ALTER TABLE payments ADD CONSTRAINT payments_product_type_check 
  CHECK (product_type IN ('course', 'gift_card', 'art_product')); 