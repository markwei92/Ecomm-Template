-- Direct fix for the Mugs category issue
-- This script takes a more direct approach by creating a new category and updating products

-- Begin a transaction so we can roll back if anything goes wrong
BEGIN;

-- First, make sure the uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Create a new temporary category
INSERT INTO product_categories (id, name, slug, created_at)
VALUES (uuid_generate_v4(), 'Mugs Temp', 'mugs-temp', NOW())
RETURNING id, name, slug;

-- Step 2: Update all products that use the old Mugs category to use the temporary category
WITH old_mugs AS (
    SELECT id FROM product_categories WHERE slug = 'mugs'
),
temp_mugs AS (
    SELECT id FROM product_categories WHERE slug = 'mugs-temp'
)
UPDATE products
SET category = (SELECT id FROM temp_mugs)
WHERE category IN (SELECT id FROM old_mugs);

-- Step 3: Delete the old Mugs category
DELETE FROM product_categories WHERE slug = 'mugs';

-- Step 4: Create a new Mugs category with the desired ID
INSERT INTO product_categories (id, name, slug, created_at)
VALUES ('00000000-0000-0000-0000-000000000002'::UUID, 'Mugs', 'mugs', NOW());

-- Step 5: Update all products to use the new Mugs category
WITH temp_mugs AS (
    SELECT id FROM product_categories WHERE slug = 'mugs-temp'
)
UPDATE products
SET category = '00000000-0000-0000-0000-000000000002'::UUID
WHERE category IN (SELECT id FROM temp_mugs);

-- Step 6: Delete the temporary category
DELETE FROM product_categories WHERE slug = 'mugs-temp';

-- Verify the changes
SELECT id, name, slug FROM product_categories WHERE slug = 'mugs';
SELECT id, title, category FROM products WHERE category = '00000000-0000-0000-0000-000000000002'::UUID;

-- If everything looks good, commit the transaction
COMMIT;
