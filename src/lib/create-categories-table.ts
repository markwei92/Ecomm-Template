import { supabase } from './supabase';

/**
 * Creates the product_categories table if it doesn't exist
 * This function uses a simpler approach that should work with limited permissions
 */
export const createCategoriesTable = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // First check if the table exists
    const { error: checkError } = await supabase
      .from('product_categories')
      .select('id', { count: 'exact', head: true });
    
    // If no error, the table exists and we can return
    if (!checkError) {
      return { success: true, message: 'Table already exists' };
    }
    
    // If the error is not about the table not existing, return the error
    if (!checkError.message.includes('does not exist') && 
        !checkError.message.includes('relation') && 
        !checkError.message.includes('column')) {
      return { 
        success: false, 
        message: `Error checking table: ${checkError.message}` 
      };
    }
    
    // Try to create the table using a simple CREATE TABLE statement
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `;
    
    // Execute the SQL
    const { error: createError } = await supabase.rpc('pgmoon.query', { query: createTableSQL });
    
    if (createError) {
      return { 
        success: false, 
        message: `Error creating table: ${createError.message}` 
      };
    }
    
    // Add the default category
    const { error: insertError } = await supabase
      .from('product_categories')
      .insert({ name: 'T-Shirts', slug: 't-shirts' })
      .select();
    
    if (insertError && !insertError.message.includes('duplicate key')) {
      return { 
        success: false, 
        message: `Error adding default category: ${insertError.message}` 
      };
    }
    
    return { success: true, message: 'Table created successfully' };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Unexpected error: ${error.message}` 
    };
  }
};
