// Script to fix the cart_items unique constraint
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

async function fixCartItemsConstraint() {
  console.log('Fixing cart_items unique constraint...');

  try {
    // First, check if the execute_sql function exists
    try {
      // Drop the existing constraint
      const { error: dropError } = await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_personalization_key;
        `
      });

      if (dropError) {
        console.error('Error dropping constraint:', dropError);
        return;
      }

      console.log('Successfully dropped existing constraint');

      // Create a new constraint that handles NULL values properly
      const { error: addError } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE UNIQUE INDEX cart_items_unique_idx
          ON cart_items (user_id, product_id, (COALESCE(personalization_text, '')));
        `
      });

      if (addError) {
        console.error('Error adding new constraint:', addError);
        return;
      }

      console.log('Successfully added new constraint that handles NULL values');
    } catch (error) {
      console.error('Error executing SQL:', error);
    }
  } catch (error) {
    console.error('Error fixing cart_items constraint:', error);
  }
}

fixCartItemsConstraint();
