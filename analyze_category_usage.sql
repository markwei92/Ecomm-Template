-- Analyze how categories are being used in the database
-- This script helps identify any inconsistencies in category usage

-- Check the product_categories table structure
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'product_categories'
ORDER BY ordinal_position;

-- Check the products table structure, focusing on the category column
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- List all categories
SELECT id, name, slug, created_at FROM product_categories ORDER BY created_at;

-- Count products by category (using the category field directly)
SELECT category, COUNT(*) as product_count
FROM products
GROUP BY category
ORDER BY product_count DESC;

-- Check if any products have category values that don't match any slug in product_categories
SELECT p.id, p.title, p.category
FROM products p
LEFT JOIN product_categories pc ON p.category = pc.slug
WHERE pc.id IS NULL AND p.category IS NOT NULL;

-- Check if any products have category values that match a UUID in product_categories
SELECT p.id, p.title, p.category, pc.id, pc.name, pc.slug
FROM products p
JOIN product_categories pc ON p.category = pc.id::text
LIMIT 10;

-- Check the specific product we're trying to fix
SELECT p.id, p.title, p.category,
       (SELECT slug FROM product_categories WHERE id::text = p.category) as matched_by_id,
       (SELECT id FROM product_categories WHERE slug = p.category) as matched_by_slug
FROM products p
WHERE p.id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';
