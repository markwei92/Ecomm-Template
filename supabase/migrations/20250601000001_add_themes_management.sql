-- Create themes table if it doesn't exist
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Extract existing themes from products table and insert them into themes table
DO $$
DECLARE
    theme_slug TEXT;
    theme_name TEXT;
    theme_slugs TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get all unique theme slugs from products table
    SELECT ARRAY(
        SELECT DISTINCT unnest(themes)
        FROM products
        WHERE themes IS NOT NULL AND array_length(themes, 1) > 0
    ) INTO theme_slugs;

    -- For each theme slug, create a proper name and insert into themes table
    FOREACH theme_slug IN ARRAY theme_slugs
    LOOP
        -- Convert slug to a proper name (e.g., 'common-phrases' to 'Common Phrases')
        theme_name := regexp_replace(
            regexp_replace(theme_slug, '-', ' ', 'g'),
            '(^|\s)([a-z])',
            '\1\2',
            'g'
        );

        -- Capitalize first letter of each word
        theme_name := regexp_replace(
            theme_name,
            '(^|\s)([a-z])',
            '\1' || upper(substring('\2' from 1 for 1)),
            'g'
        );

        -- Insert theme into themes table
        INSERT INTO themes (name, slug)
        VALUES (theme_name, theme_slug)
        ON CONFLICT (slug) DO NOTHING;
    END LOOP;
END $$;

-- Create default themes if they don't exist
INSERT INTO themes (name, slug)
VALUES
    ('Christmas', 'christmas'),
    ('Common Phrases', 'common-phrases'),
    ('Daily Life', 'daily-life'),
    ('Graphic Only', 'graphic-only'),
    ('Hobby', 'hobby'),
    ('Memes', 'memes'),
    ('Others', 'others'),
    ('Personality', 'personality'),
    ('Politics', 'politics'),
    ('Sports', 'sports'),
    ('Yoda', 'yoda')
ON CONFLICT (slug) DO NOTHING;

-- Create function to get themes with product count
CREATE OR REPLACE FUNCTION get_themes_with_product_count()
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    product_count BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.name,
        t.slug,
        COUNT(p.id) AS product_count,
        t.created_at
    FROM
        themes t
    LEFT JOIN
        (
            SELECT
                p.id,
                unnest(p.themes) AS theme_slug
            FROM
                products p
        ) p ON t.slug = p.theme_slug
    GROUP BY
        t.id, t.name, t.slug, t.created_at
    ORDER BY
        t.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to reassign products from one theme to another
CREATE OR REPLACE FUNCTION reassign_products_to_others_theme(
    old_theme_slug TEXT,
    new_theme_slug TEXT
)
RETURNS VOID AS $$
DECLARE
    product_id UUID;
BEGIN
    -- Loop through all products that have the old theme
    FOR product_id IN
        SELECT DISTINCT p.id
        FROM products p
        WHERE old_theme_slug = ANY(p.themes)
    LOOP
        -- Update the product's themes array
        UPDATE products
        SET themes = array_remove(themes, old_theme_slug)
        WHERE id = product_id;

        -- Add the new theme if it's not already there
        UPDATE products
        SET themes = array_append(themes, new_theme_slug)
        WHERE id = product_id
        AND NOT (new_theme_slug = ANY(themes));
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_themes_updated_at
BEFORE UPDATE ON themes
FOR EACH ROW
EXECUTE FUNCTION update_themes_updated_at();
