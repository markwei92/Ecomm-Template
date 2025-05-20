/*
  # Add categories columns to products table

  1. Changes
    - Add themes array column to store multiple theme categories
    - Add age_group column to store the collection/age group category
*/

ALTER TABLE products
ADD COLUMN IF NOT EXISTS themes text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS age_group text DEFAULT 'adults';

-- Add check constraint to ensure age_group is valid
ALTER TABLE products
ADD CONSTRAINT valid_age_group CHECK (age_group IN ('adults', 'kids', 'toddlers'));