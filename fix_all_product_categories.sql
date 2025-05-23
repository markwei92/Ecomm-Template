-- Fix for all product categories to ensure they use slugs instead of UUIDs
-- This script updates all products to use the correct category slug format

-- Begin a transaction so we can roll back if anything goes wrong
BEGIN;

-- Create a simpler fix script that doesn't rely on complex PL/pgSQL features
-- First, ensure the mugs category exists
INSERT INTO product_categories (name, slug, created_at)
SELECT 'Mugs', 'mugs', NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE slug = 'mugs');

-- Ensure the t-shirts category exists
INSERT INTO product_categories (name, slug, created_at)
SELECT 'T-Shirts', 't-shirts', NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE slug = 't-shirts');

-- Update the specific product to use the 'mugs' category
UPDATE products
SET category = 'mugs'
WHERE id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

-- Update any products that use a UUID as category to use the corresponding slug
UPDATE products p
SET category = pc.slug
FROM product_categories pc
WHERE p.category = CAST(pc.id AS text);

-- Set any NULL categories to 't-shirts'
UPDATE products
SET category = 't-shirts'
WHERE category IS NULL;

-- Verify the changes for the specific product
SELECT id, title, category
FROM products
WHERE id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

-- Verify all products have text categories (not UUIDs)
SELECT id, title, category
FROM products
WHERE category ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- If everything looks good, commit the transaction
COMMIT;
