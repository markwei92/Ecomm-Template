// Script to apply the personalization migration directly using SQL
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

    // First, check if the column already exists
    const { data: columnCheck, error: columnCheckError } = await supabase
      .from('products')
      .select('can_personalize')
      .limit(1);

    if (columnCheckError) {
      console.log('Column does not exist yet, adding it...');
      
      // Use the REST API to execute SQL directly
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE products ADD COLUMN IF NOT EXISTS can_personalize boolean DEFAULT false;
            ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS personalization_text text DEFAULT NULL;
            ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
            ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_id_product_id_personalization_key UNIQUE (user_id, product_id, personalization_text);
          `
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SQL execution failed: ${errorText}`);
      }

      console.log('Migration applied successfully via REST API!');
    } else {
      console.log('Column already exists, no need to apply migration.');
    }

    // Refresh the schema cache
    console.log('Refreshing schema cache...');
    await supabase.rpc('refresh_schema_cache');
    console.log('Schema cache refreshed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
applyMigration();
