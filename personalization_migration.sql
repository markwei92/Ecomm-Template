-- Add personalization support to products and cart_items tables

-- Add can_personalize column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS can_personalize boolean DEFAULT false;

-- Add personalization_text column to cart_items table
ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS personalization_text text DEFAULT NULL;

-- Update cart_items unique constraint
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_id_product_id_personalization_key UNIQUE (user_id, product_id, personalization_text);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
