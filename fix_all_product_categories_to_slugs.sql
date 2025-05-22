-- Fix all product categories to use slugs instead of UUIDs
-- This script updates all products to use the slug-based category instead of UUID

-- Begin a transaction so we can roll back if anything goes wrong
BEGIN;

-- First, make sure all necessary categories exist
INSERT INTO product_categories (name, slug, created_at)
SELECT 'T-Shirts', 't-shirts', NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE slug = 't-shirts');

INSERT INTO product_categories (name, slug, created_at)
SELECT 'Mugs', 'mugs', NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE slug = 'mugs');

-- Update the specific product to use the 'mugs' category
UPDATE products
SET category = (SELECT id FROM product_categories WHERE slug = 'mugs')
WHERE id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

-- Set any NULL categories to 't-shirts'
UPDATE products
SET category = 't-shirts'
WHERE category IS NULL;

-- Verify the changes
SELECT id, title, category
FROM products
ORDER BY title;

-- If everything looks good, commit the transaction
COMMIT;
