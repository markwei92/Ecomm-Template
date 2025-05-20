// Script to create the execute_sql RPC function
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

async function createExecuteSqlFunction() {
  try {
    console.log('Creating execute_sql function...');

    // Create the execute_sql function
    const { error } = await supabase.rpc('create_execute_sql_function', {
      function_definition: `
        CREATE OR REPLACE FUNCTION execute_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
      `
    });

    if (error) {
      // If the create_execute_sql_function doesn't exist, create it directly
      console.log('Creating function directly...');
      const { error: directError } = await supabase.from('_rpc').select('*').execute(`
        CREATE OR REPLACE FUNCTION execute_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
      `);

      if (directError) {
        console.error('Error creating execute_sql function directly:', directError);
        
        // Try one more approach - using a direct SQL query
        console.log('Trying direct SQL approach...');
        const { error: sqlError } = await supabase.from('products').select('id').limit(1);
        
        if (sqlError) {
          console.error('Error with direct SQL query:', sqlError);
          throw sqlError;
        }
        
        console.log('Direct SQL query successful, but could not create function');
      } else {
        console.log('Function created directly successfully!');
      }
    } else {
      console.log('Function created successfully!');
    }
  } catch (error) {
    console.error('Failed to create execute_sql function:', error);
  }
}

// Run the function creation
createExecuteSqlFunction();
