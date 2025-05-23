/*
  # Add category column to products table

  1. Changes
    - Add category column to store product category
*/

-- Add category column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS category text DEFAULT 't-shirts';

-- Update existing products to have 't-shirts' category
UPDATE products
SET category = 't-shirts'
WHERE category IS NULL;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
