/*
  # Add is_enabled column to product_variants table

  1. Changes
    - Add is_enabled boolean column to product_variants table
    - Default to true for existing variants
    - Update queries to filter by enabled variants on frontend
*/

-- Add is_enabled column to product_variants table
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true;

-- Update existing variants to be enabled by default
UPDATE product_variants
SET is_enabled = true
WHERE is_enabled IS NULL;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
