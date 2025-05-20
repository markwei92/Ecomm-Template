// This script applies the admin orders policy to fix the admin dashboard
// Run with: node scripts/fix_admin_orders_access.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service role key in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read the SQL migration file
const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250801000000_add_admin_orders_policy.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function applyMigration() {
  try {
    console.log('Applying admin orders policy migration...');
    
    // Execute the SQL directly
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: migrationSQL
    });
    
    if (error) {
      console.error('Error applying migration:', error);
      
      // Try an alternative approach if the RPC fails
      console.log('Trying alternative approach...');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      // Execute each statement separately
      for (const stmt of statements) {
        if (stmt.includes('DO $$')) {
          // For DO blocks, we need to execute them as is
          const doBlock = stmt + ';';
          const { error: doError } = await supabase.rpc('execute_sql', {
            sql_query: doBlock
          });
          
          if (doError) {
            console.error('Error executing DO block:', doError);
          } else {
            console.log('Successfully executed DO block');
          }
        } else {
          // For regular statements
          const { error: stmtError } = await supabase.rpc('execute_sql', {
            sql_query: stmt + ';'
          });
          
          if (stmtError) {
            console.error('Error executing statement:', stmtError);
          } else {
            console.log('Successfully executed statement');
          }
        }
      }
    } else {
      console.log('Migration applied successfully!');
    }
    
    // Verify the policies were created
    const { data: policies, error: policiesError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT
          schemaname,
          tablename,
          policyname,
          roles,
          cmd
        FROM
          pg_policies
        WHERE
          tablename = 'stripe_orders';
      `
    });
    
    if (policiesError) {
      console.error('Error checking policies:', policiesError);
    } else {
      console.log('Current policies on stripe_orders table:');
      console.log(policies);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

applyMigration();
