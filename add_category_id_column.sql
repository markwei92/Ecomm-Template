-- Add category_id column to products table
DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'category_id'
    ) THEN
        -- Add the category_id column
        ALTER TABLE products ADD COLUMN category_id UUID;
        
        -- Update existing products to set category_id based on category slug
        UPDATE products p
        SET category_id = pc.id
        FROM product_categories pc
        WHERE p.category = pc.slug;
        
        RAISE NOTICE 'Added category_id column to products table';
    ELSE
        RAISE NOTICE 'category_id column already exists in products table';
    END IF;
END
$$;
