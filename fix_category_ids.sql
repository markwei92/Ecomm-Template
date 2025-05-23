-- Fix category IDs to ensure they are valid UUIDs
DO $$
DECLARE
    category_record RECORD;
BEGIN
    -- First, make sure the uuid-ossp extension is enabled
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Loop through all categories
    FOR category_record IN
        SELECT id, name, slug FROM product_categories
    LOOP
        -- Check if the ID is a valid UUID
        BEGIN
            -- Try to cast to UUID to check validity
            PERFORM category_record.id::uuid;

            -- If we get here, it's a valid UUID, so log it
            RAISE NOTICE 'Category "%" (slug: %) has valid UUID: %',
                category_record.name, category_record.slug, category_record.id;

        EXCEPTION WHEN others THEN
            -- If we get here, it's not a valid UUID, so update it
            RAISE NOTICE 'Category "%" (slug: %) has invalid UUID: %. Updating...',
                category_record.name, category_record.slug, category_record.id;

            -- Update the category with a new UUID
            UPDATE product_categories
            SET id = uuid_generate_v4()
            WHERE id = category_record.id;

            -- Log the new ID
            RAISE NOTICE 'Updated category "%" with new UUID', category_record.name;
        END;
    END LOOP;

    -- Now check if we need to update any products that reference these categories
    -- First, check if any products have category values that match category slugs
    RAISE NOTICE 'Checking for products with category values that match category slugs...';

    -- Use explicit type casting to handle the comparison
    UPDATE products p
    SET category = pc.id::text
    FROM product_categories pc
    WHERE p.category::text = pc.slug::text;

    RAISE NOTICE 'Updated products to use category IDs instead of slugs';
END
$$;
