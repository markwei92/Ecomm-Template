-- Fix for product categories to use slugs instead of UUIDs
-- This script updates the specific product to use the 'mugs' slug

-- Begin a transaction so we can roll back if anything goes wrong
BEGIN;

-- First, make sure the uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if the 'mugs' category exists, create it if it doesn't
DO $$
DECLARE
    mugs_category_id UUID;
BEGIN
    -- Check if the category already exists
    SELECT id INTO mugs_category_id FROM product_categories WHERE slug = 'mugs';

    IF mugs_category_id IS NULL THEN
        -- Create the category
        INSERT INTO product_categories (name, slug, created_at)
        VALUES ('Mugs', 'mugs', NOW())
        RETURNING id INTO mugs_category_id;

        RAISE NOTICE 'Created new Mugs category with ID: %', mugs_category_id;
    ELSE
        RAISE NOTICE 'Mugs category already exists with ID: %', mugs_category_id;
    END IF;

    -- Update the specific product to use the 'mugs' slug directly
    -- This is the key fix - we're setting the category to the slug, not the UUID
    UPDATE products
    SET category = 'mugs'
    WHERE id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

    RAISE NOTICE 'Updated product with ID 9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c to use category slug: mugs';

    -- Also update any other products that might have been set to use the UUID instead of the slug
    UPDATE products
    SET category = 'mugs'
    WHERE category = mugs_category_id::text;

    RAISE NOTICE 'Updated any other products that were using the UUID instead of the slug';
END $$;

-- Verify the changes
SELECT id, title, category
FROM products
WHERE id = '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c';

-- If everything looks good, commit the transaction
COMMIT;
