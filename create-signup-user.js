// This script creates a user with the same method as the sign-up page
// Run with: node create-signup-user.js

import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxMTM0MiwiZXhwIjoyMDYyODg3MzQyfQ.g2vtZrwh8bsNrNVkQ4UbvLshfPQYdBej3NkrU28JpPA';

// Create Supabase clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Generate a unique email for testing
const testEmail = `signup-user-${Date.now()}@example.com`;
const testPassword = 'Password123';
const userData = {
  firstName: 'Signup',
  lastName: 'Test',
  fullName: 'Signup Test'
};

// Function to create a user with the sign-up method
async function createSignupUser() {
  console.log(`Creating user with sign-up method: ${testEmail}`);
  
  try {
    // First, try to register with Supabase Auth
    console.log('Attempting to register with Supabase Auth');

    // Check if user already exists in auth.users
    const { data: existsData, error: existsError } = await supabase
      .rpc('auth_user_exists', { user_email: testEmail });

    if (existsError) {
      console.error('Error checking if auth user exists:', existsError);
    } else if (existsData) {
      console.error('User with this email already exists');
      return null;
    }

    // Try to create user directly in auth.users using our custom function
    const { data: authUserId, error: createError } = await supabase
      .rpc('create_auth_user', {
        user_email: testEmail,
        user_password: testPassword,
        user_first_name: userData.firstName,
        user_last_name: userData.lastName
      });

    if (createError) {
      console.error('Error creating auth user with RPC:', createError);
      console.log('Trying standard Supabase Auth signup');

      // Fall back to standard Supabase Auth signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            full_name: userData.fullName
          }
        }
      });

      // If successful, return success
      if (!authError && authData.user) {
        console.log('Supabase Auth registration successful:', authData.user);
        
        // Manually confirm the email
        console.log('Manually confirming email...');
        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
          authData.user.id,
          { email_confirm: true }
        );
        
        if (confirmError) {
          console.error('Error confirming email:', confirmError);
        } else {
          console.log('Email confirmed successfully');
        }

        return authData.user;
      }

      // If there's an error, log it
      if (authError) {
        console.error('Supabase Auth registration failed:', authError);
        return null;
      }
    } else {
      // User created successfully with our custom function
      console.log('Auth user created successfully with RPC:', authUserId);
      return { id: authUserId, email: testEmail };
    }
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
  console.log('Supabase Sign-up User Creation Test');
  console.log('==================================');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');
  
  // Create a new user
  const user = await createSignupUser();
  
  if (user) {
    // Test login with the new user
    await testLogin(testEmail, testPassword);
  }
  
  console.log('\nTest completed');
}

// Run the main function
main();
