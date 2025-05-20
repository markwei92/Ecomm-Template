/*
  # Add personalization support to products

  1. Changes
    - Add can_personalize boolean column to products table
    - Add personalization_text column to cart_items table
*/

-- Add personalization flag to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS can_personalize boolean DEFAULT false;

-- Add personalization text to cart_items table
ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS personalization_text text DEFAULT NULL;

-- Update cart_items unique constraint to include personalization
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_id_product_id_personalization_key UNIQUE (user_id, product_id, personalization_text);
