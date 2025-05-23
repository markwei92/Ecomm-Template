-- Check the structure of the product_categories table using information_schema
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'product_categories'
ORDER BY ordinal_position;

-- Check the structure of the products table using information_schema
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Check the content of the product_categories table
SELECT * FROM product_categories;

-- Check how categories are stored in the products table
SELECT id, title, category FROM products LIMIT 10;

-- Check the specific product
SELECT id, title, category FROM products WHERE id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

-- Check if there's a join between products and product_categories
-- Using explicit cast to handle type conversion
SELECT p.id, p.title, p.category, pc.id as category_id, pc.name as category_name, pc.slug as category_slug
FROM products p
LEFT JOIN product_categories pc ON p.category = CAST(pc.id AS text)
WHERE p.id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

-- Check if there's a join between products and product_categories using slug
SELECT p.id, p.title, p.category, pc.id as category_id, pc.name as category_name, pc.slug as category_slug
FROM products p
LEFT JOIN product_categories pc ON p.category = pc.slug
WHERE p.id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';
