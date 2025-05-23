-- Fix for the specific product with ID 9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c
-- This script focuses on fixing just this one product

-- Begin a transaction so we can roll back if anything goes wrong
BEGIN;

-- Ensure the mugs category exists
INSERT INTO product_categories (name, slug, created_at)
SELECT 'Mugs', 'mugs', NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE slug = 'mugs');

-- Update the specific product to use the 'mugs' slug directly
UPDATE products
SET category = 'mugs'
WHERE id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

-- Verify the changes
SELECT p.id, p.title, p.category
FROM products p
WHERE p.id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

-- Also verify the join works correctly
SELECT p.id, p.title, p.category, pc.name as category_name, pc.slug as category_slug
FROM products p
LEFT JOIN product_categories pc ON p.category = pc.slug
WHERE p.id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

-- If everything looks good, commit the transaction
COMMIT;
