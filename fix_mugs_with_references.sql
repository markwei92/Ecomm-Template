-- Fix for the Mugs category with proper handling of foreign key constraints
-- This script creates a temporary category, updates products, then updates the original category

-- First, make sure the uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Begin a transaction so we can roll back if anything goes wrong
BEGIN;

-- Get the current ID of the Mugs category
DO $$
DECLARE
    mugs_id UUID;
    new_mugs_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
    temp_mugs_id UUID;
BEGIN
    -- Get the current ID of the Mugs category
    SELECT id INTO mugs_id FROM product_categories WHERE slug = 'mugs';

    IF FOUND THEN
        RAISE NOTICE 'Found Mugs category with ID: %', mugs_id;

        -- First, check if the new category ID already exists
        IF EXISTS (SELECT 1 FROM product_categories WHERE id = new_mugs_id) THEN
            RAISE NOTICE 'Category with ID % already exists, using a temporary ID instead', new_mugs_id;
            -- Generate a temporary UUID
            temp_mugs_id := uuid_generate_v4();
        ELSE
            -- Create the new category with the desired ID
            INSERT INTO product_categories (id, name, slug, created_at)
            VALUES (new_mugs_id, 'Mugs (New)', 'mugs-new', NOW());

            RAISE NOTICE 'Created new Mugs category with ID: %', new_mugs_id;
            temp_mugs_id := new_mugs_id;
        END IF;

        -- Update all products to use the temporary category
        UPDATE products
        SET category = temp_mugs_id
        WHERE category = mugs_id;

        RAISE NOTICE 'Updated products to use temporary category ID: %', temp_mugs_id;

        -- Delete the old category
        DELETE FROM product_categories WHERE id = mugs_id;
        RAISE NOTICE 'Deleted old Mugs category with ID: %', mugs_id;

        -- If we used a temporary ID, now update to the desired ID
        IF temp_mugs_id <> new_mugs_id THEN
            -- Update the temporary category to have the desired ID
            UPDATE product_categories
            SET id = new_mugs_id, name = 'Mugs', slug = 'mugs'
            WHERE id = temp_mugs_id;

            -- Update all products to use the final ID
            UPDATE products
            SET category = new_mugs_id
            WHERE category = temp_mugs_id;

            RAISE NOTICE 'Updated temporary category and products to use final ID: %', new_mugs_id;
        ELSE
            -- Just update the name and slug
            UPDATE product_categories
            SET name = 'Mugs', slug = 'mugs'
            WHERE id = new_mugs_id;

            RAISE NOTICE 'Updated category name and slug';
        END IF;
    ELSE
        RAISE NOTICE 'Mugs category not found, creating it';

        -- Create the Mugs category with the new ID
        INSERT INTO product_categories (id, name, slug, created_at)
        VALUES (new_mugs_id, 'Mugs', 'mugs', NOW());

        RAISE NOTICE 'Created Mugs category with ID: %', new_mugs_id;
    END IF;
END $$;

-- Verify the changes
SELECT id, name, slug FROM product_categories WHERE slug = 'mugs';
SELECT id, title, category FROM products WHERE category = '00000000-0000-0000-0000-000000000002'::UUID;

-- If everything looks good, commit the transaction
COMMIT;
