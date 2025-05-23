-- Check if there are any products with the "mugs" category
-- First, get the ID of the Mugs category
SELECT id, name, slug 
FROM product_categories 
WHERE slug = 'mugs';

-- Then, check if there are any products with this category
WITH mugs_category AS (
    SELECT id FROM product_categories WHERE slug = 'mugs'
)
SELECT p.id, p.title, p.category, pc.slug as category_slug
FROM products p
LEFT JOIN product_categories pc ON p.category = pc.id
WHERE p.category IN (SELECT id FROM mugs_category)
OR pc.slug = 'mugs';

-- Also check if there are any products with category = 'mugs' (as text)
SELECT id, title, category
FROM products
WHERE category::text = 'mugs';

-- Check if there are any products with invalid category references
SELECT p.id, p.title, p.category
FROM products p
LEFT JOIN product_categories pc ON p.category = pc.id
WHERE pc.id IS NULL AND p.category IS NOT NULL;
