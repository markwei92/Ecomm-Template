// This script deletes users from Supabase Auth
// Run with: node delete-users.js

import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxMTM0MiwiZXhwIjoyMDYyODg3MzQyfQ.g2vtZrwh8bsNrNVkQ4UbvLshfPQYdBej3NkrU28JpPA';

// Create Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// List of user IDs to delete
const userIdsToDelete = [
  '2f59a126-2bbe-4fb4-a3d0-24ab4f26eb19',
  '79fc38bf-682b-4355-a223-b6f989535aff',
  '2ea1fd3a-c581-4e07-bf64-9f311e625663',
  'e80f72ac-c872-4769-afa7-757db779adf8',
  '27478dab-6573-406a-9680-77968ff8f424',
  'fb929813-de21-4236-9c55-6f127d513d50',
  '985e47cc-6019-4019-b5a2-6bf9ce027849'
];

// Function to delete a user
async function deleteUser(userId) {
  console.log(`Attempting to delete user: ${userId}`);
  
  try {
    // Try using the admin.deleteUser method
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error(`Error deleting user ${userId}:`, error.message);
      return false;
    }
    
    console.log(`Successfully deleted user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Exception deleting user ${userId}:`, error.message);
    return false;
  }
}

// Function to list all users
async function listUsers() {
  console.log('Listing all users...');
  
  try {
    // Create a SQL function to list users if it doesn't exist
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION list_auth_users()
      RETURNS TABLE (
        id uuid,
        email text,
        created_at timestamptz,
        confirmed_at timestamptz,
        last_sign_in_at timestamptz
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          au.id,
          au.email,
          au.created_at,
          au.email_confirmed_at as confirmed_at,
          au.last_sign_in_at
        FROM auth.users au
        ORDER BY au.created_at DESC;
      EXCEPTION
        WHEN others THEN
          RAISE EXCEPTION 'Error listing users: %', SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Execute the SQL to create the function
    const { error: createError } = await supabaseAdmin.rpc('run_sql', { 
      sql: createFunctionSQL 
    });
    
    if (createError) {
      console.error('Error creating function:', createError.message);
      
      // Try to use the function anyway, it might already exist
      console.log('Trying to use the function anyway...');
    }
    
    // Call the function to list users
    const { data, error } = await supabaseAdmin.rpc('list_auth_users');
    
    if (error) {
      console.error('Error listing users:', error.message);
      
      // Try an alternative approach
      console.log('Trying alternative approach to list users...');
      
      // Try to query the auth.users table directly
      const { data: directData, error: directError } = await supabaseAdmin
        .from('auth.users')
        .select('id, email, created_at, email_confirmed_at, last_sign_in_at')
        .order('created_at', { ascending: false });
        
      if (directError) {
        console.error('Error with direct query:', directError.message);
        return [];
      }
      
      return directData || [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception listing users:', error.message);
    return [];
  }
}

// Function to delete users with SQL
async function deleteUserWithSQL(userId) {
  console.log(`Attempting to delete user with SQL: ${userId}`);
  
  try {
    // Create a SQL function to delete users if it doesn't exist
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION delete_auth_user(user_id uuid)
      RETURNS jsonb AS $$
      DECLARE
        result jsonb;
      BEGIN
        -- Delete from auth.users
        DELETE FROM auth.users WHERE id = user_id;
        
        IF FOUND THEN
          result := json_build_object(
            'success', true,
            'message', 'User deleted successfully'
          );
        ELSE
          result := json_build_object(
            'success', false,
            'message', 'User not found'
          );
        END IF;
        
        RETURN result;
      EXCEPTION
        WHEN others THEN
          result := json_build_object(
            'success', false,
            'message', SQLERRM,
            'error', SQLSTATE
          );
          RETURN result;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Execute the SQL to create the function
    const { error: createError } = await supabaseAdmin.rpc('run_sql', { 
      sql: createFunctionSQL 
    });
    
    if (createError) {
      console.error('Error creating delete function:', createError.message);
      
      // Try to use the function anyway, it might already exist
      console.log('Trying to use the delete function anyway...');
    }
    
    // Call the function to delete the user
    const { data, error } = await supabaseAdmin.rpc('delete_auth_user', { 
      user_id: userId 
    });
    
    if (error) {
      console.error(`Error deleting user ${userId} with SQL:`, error.message);
      return false;
    }
    
    console.log(`SQL delete result for user ${userId}:`, data);
    return data?.success || false;
  } catch (error) {
    console.error(`Exception deleting user ${userId} with SQL:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('Supabase User Deletion Tool');
  console.log('==========================');
  console.log('URL:', supabaseUrl);
  console.log('Service Key (first 10 chars):', supabaseServiceKey.substring(0, 10) + '...');
  
  // List all users first
  const users = await listUsers();
  console.log(`Found ${users.length} users:`);
  
  if (users.length > 0) {
    users.forEach(user => {
      console.log(`- ${user.id}: ${user.email} (created: ${user.created_at}, confirmed: ${user.confirmed_at || 'No'})`);
    });
  }
  
  // Delete each user
  console.log('\nDeleting users...');
  
  for (const userId of userIdsToDelete) {
    // First try the admin API
    let success = await deleteUser(userId);
    
    // If that fails, try SQL
    if (!success) {
      console.log(`Admin API deletion failed for ${userId}, trying SQL approach...`);
      success = await deleteUserWithSQL(userId);
    }
    
    if (success) {
      console.log(`✅ User ${userId} deleted successfully`);
    } else {
      console.log(`❌ Failed to delete user ${userId}`);
    }
  }
  
  console.log('\nDeletion process completed');
}

// Run the main function
main();
