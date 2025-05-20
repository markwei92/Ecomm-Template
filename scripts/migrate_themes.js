// Script to migrate themes from products to themes table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to capitalize first letter of each word
function toTitleCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function migrateThemes() {
  try {
    console.log('Starting theme migration...');

    // Step 1: Create themes table if it doesn't exist
    console.log('Creating themes table if it doesn\'t exist...');
    await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS themes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    // Step 2: Get all unique themes from products
    console.log('Fetching unique themes from products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('themes');

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    // Extract unique theme slugs
    const themeSet = new Set();
    products.forEach(product => {
      if (product.themes && Array.isArray(product.themes)) {
        product.themes.forEach(theme => {
          if (theme) themeSet.add(theme);
        });
      }
    });

    const uniqueThemes = Array.from(themeSet);
    console.log(`Found ${uniqueThemes.length} unique themes: ${uniqueThemes.join(', ')}`);

    // Step 3: Insert themes into themes table
    console.log('Inserting themes into themes table...');
    for (const themeSlug of uniqueThemes) {
      const themeName = toTitleCase(themeSlug);

      const { error: insertError } = await supabase
        .from('themes')
        .insert({ name: themeName, slug: themeSlug })
        .onConflict('slug')
        .ignore();

      if (insertError) {
        console.warn(`Warning: Could not insert theme ${themeSlug}: ${insertError.message}`);
      } else {
        console.log(`Inserted theme: ${themeName} (${themeSlug})`);
      }
    }

    // Step 4: Add default themes
    console.log('Adding default themes...');
    const defaultThemes = [
      { name: 'Christmas', slug: 'christmas' },
      { name: 'Common Phrases', slug: 'common-phrases' },
      { name: 'Daily Life', slug: 'daily-life' },
      { name: 'Graphic Only', slug: 'graphic-only' },
      { name: 'Hobby', slug: 'hobby' },
      { name: 'Memes', slug: 'memes' },
      { name: 'Others', slug: 'others' },
      { name: 'Personality', slug: 'personality' },
      { name: 'Politics', slug: 'politics' },
      { name: 'Sports', slug: 'sports' },
      { name: 'Yoda', slug: 'yoda' }
    ];

    for (const theme of defaultThemes) {
      const { error: insertError } = await supabase
        .from('themes')
        .insert(theme)
        .onConflict('slug')
        .ignore();

      if (insertError) {
        console.warn(`Warning: Could not insert default theme ${theme.slug}: ${insertError.message}`);
      }
    }

    // Step 5: Create function to get themes with product count
    console.log('Creating function to get themes with product count...');
    await supabase.rpc('execute_sql', {
      sql: `
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
      `
    });

    // Step 6: Create function to reassign products
    console.log('Creating function to reassign products...');
    await supabase.rpc('execute_sql', {
      sql: `
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
      `
    });

    // Step 7: Create trigger to update the updated_at timestamp
    console.log('Creating trigger to update the updated_at timestamp...');
    await supabase.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_themes_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS update_themes_updated_at ON themes;

        CREATE TRIGGER update_themes_updated_at
        BEFORE UPDATE ON themes
        FOR EACH ROW
        EXECUTE FUNCTION update_themes_updated_at();
      `
    });

    console.log('Theme migration completed successfully!');
  } catch (error) {
    console.error('Error during theme migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateThemes();
