-- Add Mugs category to product_categories table
-- This script adds the missing "Mugs" category that should appear in the product catalogue filters

-- Insert the Mugs category if it doesn't already exist
INSERT INTO product_categories (name, slug)
VALUES ('Mugs', 'mugs')
ON CONFLICT (slug) DO NOTHING;

-- Update any products that contain "mug" in the title to have the mugs category
UPDATE products 
SET category = 'mugs' 
WHERE title ILIKE '%mug%' AND category != 'mugs';

-- Verify the category was added
SELECT 'Categories after adding Mugs:' as info;
SELECT id, name, slug, created_at FROM product_categories ORDER BY created_at;

-- Check if any products are now categorized as mugs
SELECT 'Products with mugs category:' as info;
SELECT id, title, category FROM products WHERE category = 'mugs';
