-- Simple fix for the Mugs category
-- This script directly sets the category to the mugs category ID for the specific product

-- First, ensure the mugs category exists and get its ID
DO $$
DECLARE
    mugs_category_id UUID;
BEGIN
    -- Check if the category already exists
    SELECT id INTO mugs_category_id FROM product_categories WHERE slug = 'mugs';

    IF mugs_category_id IS NULL THEN
        -- Create the category with a new UUID
        INSERT INTO product_categories (name, slug, created_at)
        VALUES ('Mugs', 'mugs', NOW())
        RETURNING id INTO mugs_category_id;
    END IF;

    -- Update the specific product to use the mugs category ID
    UPDATE products
    SET category = mugs_category_id
    WHERE id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';
END $$;

-- Verify the changes
SELECT p.id, p.title, p.category, pc.name as category_name, pc.slug as category_slug
FROM products p
LEFT JOIN product_categories pc ON p.category = pc.id
WHERE p.id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';
