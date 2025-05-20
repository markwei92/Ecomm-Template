// This script creates a new user using SQL functions
// Run with: node create-user-with-sql.js

import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxMTM0MiwiZXhwIjoyMDYyODg3MzQyfQ.g2vtZrwh8bsNrNVkQ4UbvLshfPQYdBej3NkrU28JpPA';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944';

// Create Supabase clients
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate a unique email for testing
const testEmail = `test-user-${Date.now()}@example.com`;
const testPassword = '123456';

// Function to create a user using SQL
async function createUserWithSQL() {
  console.log(`Creating user with SQL: ${testEmail}`);
  
  try {
    // Check if we have a create_auth_user function
    const { data: functionExists, error: functionError } = await supabaseAdmin
      .rpc('function_exists', { function_name: 'create_auth_user' });
      
    if (functionError) {
      console.error('Error checking if function exists:', functionError.message);
      return null;
    }
    
    console.log('create_auth_user function exists:', functionExists);
    
    if (!functionExists) {
      console.log('Creating create_auth_user function...');
      
      // Create the function
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION create_auth_user(
          user_email TEXT,
          user_password TEXT,
          user_data JSONB DEFAULT '{}'::JSONB
        ) RETURNS JSONB AS $$
        DECLARE
          new_user JSONB;
          result JSONB;
        BEGIN
          -- Insert the user into auth.users
          INSERT INTO auth.users (
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_sent_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            last_sign_in_at
          )
          VALUES (
            user_email,
            crypt(user_password, gen_salt('bf')),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            user_data,
            now(),
            now(),
            now()
          )
          RETURNING id, email, created_at INTO new_user;
          
          result := json_build_object(
            'success', true,
            'message', 'User created successfully',
            'user', new_user
          );
          
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
      
      const { error: createError } = await supabaseAdmin.rpc('run_sql', { sql: createFunctionSQL });
      
      if (createError) {
        console.error('Error creating function:', createError.message);
        return null;
      }
      
      console.log('Function created successfully');
    }
    
    // Now create the user
    const { data: userData, error: userError } = await supabaseAdmin
      .rpc('create_auth_user', { 
        user_email: testEmail,
        user_password: testPassword,
        user_data: { first_name: 'Test', last_name: 'User' }
      });
      
    if (userError) {
      console.error('Error creating user:', userError.message);
      return null;
    }
    
    console.log('User created successfully:', userData);
    return userData.user;
  } catch (error) {
    console.error('Exception during user creation:', error.message);
    return null;
  }
}

// Function to test login
async function testLogin(email, password) {
  console.log(`\nTesting login for: ${email}`);
  
  try {
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login failed:', error.message);
      return false;
    }
    
    console.log('Login successful!');
    console.log('User:', {
      id: data.user.id,
      email: data.user.email
    });
    return true;
  } catch (error) {
    console.error('Exception during login:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('Supabase User Creation with SQL Test');
  console.log('===================================');
  console.log('URL:', supabaseUrl);
  console.log('Service Key (first 10 chars):', supabaseServiceKey.substring(0, 10) + '...');
  
  // Create a new user
  const user = await createUserWithSQL();
  
  if (user) {
    // Test login with the new user
    await testLogin(testEmail, testPassword);
  }
  
  console.log('\nTest completed');
}

// Run the main function
main();
