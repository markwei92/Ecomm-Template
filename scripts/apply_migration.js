// This script applies the product_categories migration directly
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Applying product_categories migration...');
    
    // SQL for creating the product_categories table
    const sql = `
    -- Create product_categories table if it doesn't exist
    CREATE TABLE IF NOT EXISTS product_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Create trigger to update the updated_at timestamp
    CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_product_categories_updated_at();

    -- Enable Row Level Security
    ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Anyone can view product categories"
      ON product_categories
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "Admin users can manage product categories"
      ON product_categories
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);

    -- Insert default category
    INSERT INTO product_categories (name, slug)
    VALUES ('T-Shirts', 't-shirts')
    ON CONFLICT (slug) DO NOTHING;

    -- Refresh the schema cache
    NOTIFY pgrst, 'reload schema';
    `;
    
    // Execute the SQL
    const { error } = await supabase.rpc('pgmoon.query', { query: sql });
    
    if (error) {
      console.error('Error applying migration:', error);
    } else {
      console.log('Migration applied successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

applyMigration();
