// Script to create SQL functions for user deletion
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

async function createUserDeletionFunctions() {
  console.log('Creating user deletion functions...');

  try {
    // Create a function to get user ID by email
    const getUserIdFunctionDefinition = `
      CREATE OR REPLACE FUNCTION get_user_id_by_email(email_param TEXT)
      RETURNS TABLE (id UUID) AS $$
      BEGIN
        RETURN QUERY
        SELECT au.id FROM auth.users au WHERE au.email = email_param;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Create a function to delete user by email
    const deleteUserFunctionDefinition = `
      CREATE OR REPLACE FUNCTION delete_user_by_email(email_param TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        user_id UUID;
      BEGIN
        -- Find the user ID
        SELECT id INTO user_id FROM auth.users WHERE email = email_param;
        
        -- If found, delete from all related tables
        IF user_id IS NOT NULL THEN
          -- Delete from related tables
          DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = user_id);
          DELETE FROM auth.sessions WHERE user_id = user_id;
          DELETE FROM auth.identities WHERE user_id = user_id;
          DELETE FROM auth.users WHERE id = user_id;
          RETURN TRUE;
        END IF;
        
        -- If not found by ID, try to delete by email directly
        DELETE FROM auth.users WHERE email = email_param;
        
        RETURN TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Create a function to create other functions
    const createFunctionDefinition = `
      CREATE OR REPLACE FUNCTION create_function(function_name TEXT, function_definition TEXT)
      RETURNS BOOLEAN AS $$
      BEGIN
        EXECUTE function_definition;
        RETURN TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Error creating function %: %', function_name, SQLERRM;
          RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // First try to create the create_function function
    try {
      // Use direct SQL to create the create_function function
      const { data, error } = await supabase
        .from('_dummy_table_for_sql')
        .select('*')
        .limit(1)
        .execute(createFunctionDefinition);

      if (error) {
        console.error('Error creating create_function function:', error);
      } else {
        console.log('create_function function created successfully');
      }
    } catch (error) {
      console.error('Error executing direct SQL for create_function:', error);
    }

    // Now use the create_function function to create the other functions
    try {
      const { data: getUserIdData, error: getUserIdError } = await supabase
        .rpc('create_function', {
          function_name: 'get_user_id_by_email',
          function_definition: getUserIdFunctionDefinition
        });

      if (getUserIdError) {
        console.error('Error creating get_user_id_by_email function:', getUserIdError);
      } else {
        console.log('get_user_id_by_email function created successfully');
      }

      const { data: deleteUserData, error: deleteUserError } = await supabase
        .rpc('create_function', {
          function_name: 'delete_user_by_email',
          function_definition: deleteUserFunctionDefinition
        });

      if (deleteUserError) {
        console.error('Error creating delete_user_by_email function:', deleteUserError);
      } else {
        console.log('delete_user_by_email function created successfully');
      }
    } catch (error) {
      console.error('Error using create_function RPC:', error);
      
      // If the RPC approach fails, try direct REST API calls
      console.log('Trying direct REST API calls...');
      
      try {
        // Create get_user_id_by_email function
        const getUserIdResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_function`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            function_name: 'get_user_id_by_email',
            function_definition: getUserIdFunctionDefinition
          })
        });
        
        if (!getUserIdResponse.ok) {
          console.error('Error creating get_user_id_by_email function via REST API:', await getUserIdResponse.text());
        } else {
          console.log('get_user_id_by_email function created successfully via REST API');
        }
        
        // Create delete_user_by_email function
        const deleteUserResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_function`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            function_name: 'delete_user_by_email',
            function_definition: deleteUserFunctionDefinition
          })
        });
        
        if (!deleteUserResponse.ok) {
          console.error('Error creating delete_user_by_email function via REST API:', await deleteUserResponse.text());
        } else {
          console.log('delete_user_by_email function created successfully via REST API');
        }
      } catch (restError) {
        console.error('Error with direct REST API calls:', restError);
      }
    }

    // Test the functions
    try {
      // Test get_user_id_by_email
      const { data: testGetUserIdData, error: testGetUserIdError } = await supabase
        .rpc('get_user_id_by_email', {
          email_param: 'test7@test7.com'
        });

      if (testGetUserIdError) {
        console.error('Error testing get_user_id_by_email function:', testGetUserIdError);
      } else {
        console.log('get_user_id_by_email function tested successfully:', testGetUserIdData);
      }
    } catch (testError) {
      console.error('Error testing functions:', testError);
    }
  } catch (error) {
    console.error('Error creating user deletion functions:', error);
  }
}

// Run the function creation
createUserDeletionFunctions();
