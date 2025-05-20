// Script to create the execute_sql RPC function
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

async function createExecuteSqlFunction() {
  console.log('Creating execute_sql function...');

  try {
    // Try to call the function to create the execute_sql function
    try {
      const { error } = await supabase.rpc('create_execute_sql_function');

      if (!error) {
        console.log('execute_sql function created successfully!');
        return;
      }
    } catch (e) {
      console.log('create_execute_sql_function does not exist, creating it...');
      // Create the execute_sql function directly
      console.log('Creating execute_sql function directly...');

      try {
        // Use direct SQL to create the execute_sql function
        const { data, error: directError } = await supabase
          .from('_dummy_table_for_sql')
          .select('*')
          .limit(1)
          .execute(`
            CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
            RETURNS void AS $$
            BEGIN
              EXECUTE sql_query;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
          `);

        if (directError) {
          console.error('Error creating execute_sql function directly:', directError);

          // Try another approach - create a temporary table and execute SQL
          console.log('Trying alternative approach...');
          // Create a SQL function directly using the REST API
          const functionDefinition = `
            CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
            RETURNS void AS $$
            BEGIN
              EXECUTE sql_query;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
          `;

          // Use the REST API to execute SQL directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql_query: functionDefinition })
          });

          if (!response.ok) {
            console.error('Error creating execute_sql function via REST API:', await response.text());
            console.log('Falling back to direct SQL execution...');

            // As a last resort, try to create a simple function that just returns true
            const { error: simpleError } = await supabase
              .rpc('create_simple_function', {
                function_name: 'execute_sql',
                function_body: 'EXECUTE sql_query;',
                param_name: 'sql_query',
                param_type: 'text',
                return_type: 'void'
              });

            if (simpleError) {
              console.error('Error creating simple function:', simpleError);
              return;
            }
          } else {
            console.log('execute_sql function created successfully via REST API!');
          }
        } else {
          console.log('execute_sql function created successfully via direct SQL!');
        }
      } catch (directSqlError) {
        console.error('Error executing direct SQL:', directSqlError);
      }
    }

    // Test the function
    try {
      const { error: testError } = await supabase.rpc('execute_sql', {
        sql_query: "SELECT 1"
      });

      if (testError) {
        console.error('Error testing execute_sql function:', testError);
      } else {
        console.log('execute_sql function tested successfully!');
      }
    } catch (testError) {
      console.error('Error testing execute_sql function:', testError);
    }
  } catch (error) {
    console.error('Error creating execute_sql function:', error);
  }
}

createExecuteSqlFunction();
