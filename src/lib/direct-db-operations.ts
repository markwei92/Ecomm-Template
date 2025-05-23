import { supabase } from './supabase';

/**
 * Directly executes SQL to create the product_categories table
 * This bypasses the schema cache issues
 */
export const createCategoriesTableDirect = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // SQL to create the table and insert default data
    const sql = `
      -- Create the table if it doesn't exist
      CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      -- Insert default category if it doesn't exist
      INSERT INTO product_categories (name, slug)
      VALUES ('T-Shirts', 't-shirts')
      ON CONFLICT (slug) DO NOTHING;
    `;

    // Execute the SQL directly
    const { error } = await supabase.rpc('pgmoon.query', { query: sql });

    if (error) {
      console.error('SQL execution error:', error);
      return { success: false, message: `Error executing SQL: ${error.message}` };
    }

    // Force a schema refresh
    const refreshSql = `NOTIFY pgrst, 'reload schema';`;
    await supabase.rpc('pgmoon.query', { query: refreshSql });

    return { success: true, message: 'Table created successfully' };
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error.message}` };
  }
};

/**
 * Directly inserts a category using SQL
 * This bypasses the schema cache issues
 */
export const insertCategoryDirect = async (name: string, slug: string): Promise<{ success: boolean; message: string; id?: string }> => {
  try {
    // SQL to insert the category
    const sql = `
      INSERT INTO product_categories (name, slug)
      VALUES ('${name.replace(/'/g, "''")}', '${slug.replace(/'/g, "''")}')
      RETURNING id;
    `;

    // Execute the SQL directly
    const { data, error } = await supabase.rpc('pgmoon.query', { query: sql });

    if (error) {
      if (error.message.includes('duplicate key')) {
        return { success: false, message: 'A category with this name already exists' };
      }
      console.error('SQL execution error:', error);
      return { success: false, message: `Error inserting category: ${error.message}` };
    }

    // Extract the ID from the result
    let id = '';
    if (data && data.length > 0 && data[0].length > 0) {
      id = data[0][0].id;
    }

    return { success: true, message: 'Category added successfully', id };
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error.message}` };
  }
};

/**
 * Directly fetches categories using SQL
 * This bypasses the schema cache issues
 */
export const fetchCategoriesDirect = async (): Promise<{ success: boolean; message: string; categories: any[] }> => {
  try {
    // SQL to fetch categories
    const sql = `
      SELECT id, name, slug, created_at, updated_at
      FROM product_categories
      ORDER BY created_at;
    `;

    // Execute the SQL directly
    const { data, error } = await supabase.rpc('pgmoon.query', { query: sql });

    if (error) {
      console.error('SQL execution error:', error);
      return { success: false, message: `Error fetching categories: ${error.message}`, categories: [] };
    }

    // Format the results
    const categories = data && data.length > 0 ? data[0] : [];

    return { success: true, message: 'Categories fetched successfully', categories };
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error.message}`, categories: [] };
  }
};

/**
 * Directly deletes a category using SQL
 * This bypasses the schema cache issues
 */
export const deleteCategoryDirect = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    // SQL to delete the category
    const sql = `
      DELETE FROM product_categories
      WHERE id = '${id.replace(/'/g, "''")}';
    `;

    // Execute the SQL directly
    const { error } = await supabase.rpc('pgmoon.query', { query: sql });

    if (error) {
      console.error('SQL execution error:', error);
      return { success: false, message: `Error deleting category: ${error.message}` };
    }

    return { success: true, message: 'Category deleted successfully' };
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { success: false, message: `Unexpected error: ${error.message}` };
  }
};
