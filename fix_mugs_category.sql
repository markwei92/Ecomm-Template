-- Fix the "Mugs" category specifically
DO $$
DECLARE
    mugs_category_id UUID;
    existing_id UUID;
    is_valid_uuid BOOLEAN;
BEGIN
    -- First, make sure the uuid-ossp extension is enabled
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Check if the Mugs category exists
    BEGIN
        SELECT id INTO existing_id
        FROM product_categories
        WHERE slug = 'mugs';

        -- Check if the existing ID is a valid UUID
        BEGIN
            -- Try to cast to UUID to check validity
            PERFORM existing_id::uuid;
            is_valid_uuid := TRUE;

            -- If we get here, it's a valid UUID, so use it
            mugs_category_id := existing_id;
            RAISE NOTICE 'Existing "Mugs" category has valid UUID: %', mugs_category_id;

        EXCEPTION WHEN others THEN
            -- If we get here, it's not a valid UUID, so generate a new one
            is_valid_uuid := FALSE;
            mugs_category_id := uuid_generate_v4();
            RAISE NOTICE 'Existing "Mugs" category has invalid UUID. Generated new UUID: %', mugs_category_id;

            -- Update the Mugs category to have a valid UUID
            UPDATE product_categories
            SET id = mugs_category_id
            WHERE slug = 'mugs';

            RAISE NOTICE 'Updated "Mugs" category with new UUID: %', mugs_category_id;
        END;

    EXCEPTION WHEN NO_DATA_FOUND THEN
        -- If we get here, the Mugs category doesn't exist, so create it
        mugs_category_id := uuid_generate_v4();

        -- Create the Mugs category
        INSERT INTO product_categories (id, name, slug, created_at)
        VALUES (mugs_category_id, 'Mugs', 'mugs', NOW());

        RAISE NOTICE 'Created "Mugs" category with UUID: %', mugs_category_id;
    END;

    -- Now update any products that have 'mugs' as their category
    UPDATE products
    SET category = mugs_category_id::text
    WHERE category::text = 'mugs';

    RAISE NOTICE 'Updated products with category "mugs" to use the new UUID';

    -- Also update any products that might have the old invalid UUID
    IF NOT is_valid_uuid AND existing_id IS NOT NULL THEN
        UPDATE products
        SET category = mugs_category_id::text
        WHERE category::text = existing_id::text;

        RAISE NOTICE 'Updated products with old invalid UUID to use the new UUID';
    END IF;
END
$$;
