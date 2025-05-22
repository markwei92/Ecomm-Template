-- Alter the products table to change the category column from UUID to text
-- This script modifies the database schema to match the application's expectations

-- Begin a transaction so we can roll back if anything goes wrong
BEGIN;

-- First, make sure all products have a valid category slug
-- Run the fix_all_product_categories_to_slugs.sql script first

-- Now, alter the column type from UUID to text
-- Using explicit CAST for type conversion
ALTER TABLE products
ALTER COLUMN category TYPE text USING CAST(category AS text);

-- Set a default value for the category column
ALTER TABLE products
ALTER COLUMN category SET DEFAULT 't-shirts';

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'category';

-- If everything looks good, commit the transaction
COMMIT;
