// Script to apply the personalization migration directly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

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

async function applyMigration() {
  try {
    console.log('Applying personalization migration...');

    // Add can_personalize column to products table
    const { error: productsError } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS can_personalize boolean DEFAULT false;'
    });

    if (productsError) {
      console.error('Error adding can_personalize column:', productsError);
      throw productsError;
    }

    // Add personalization_text column to cart_items table
    const { error: cartError } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS personalization_text text DEFAULT NULL;'
    });

    if (cartError) {
      console.error('Error adding personalization_text column:', cartError);
      throw cartError;
    }

    // Update cart_items unique constraint
    const { error: constraintError1 } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;'
    });

    if (constraintError1) {
      console.error('Error dropping constraint:', constraintError1);
      throw constraintError1;
    }

    const { error: constraintError2 } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_id_product_id_personalization_key UNIQUE (user_id, product_id, personalization_text);'
    });

    if (constraintError2) {
      console.error('Error adding new constraint:', constraintError2);
      throw constraintError2;
    }

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
applyMigration();
