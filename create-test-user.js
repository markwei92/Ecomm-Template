// This script creates a test user in Supabase
// Run with: node create-test-user.js

import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test user data
const testUser = {
  email: 'test-user-' + Date.now() + '@example.com',
  password: '123456',
  firstName: 'Test',
  lastName: 'User'
};

// Function to create a user
async function createUser() {
  console.log(`Creating user: ${testUser.email}`);
  
  try {
    // Try to sign up
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          full_name: `${testUser.firstName} ${testUser.lastName}`
        }
      }
    });
    
    if (error) {
      console.error('User creation failed:', error.message);
      return false;
    }
    
    console.log('User created successfully!');
    console.log('User:', {
      id: data.user.id,
      email: data.user.email
    });
    
    // Now try to sign in with the new user
    console.log('\nTrying to sign in with the new user...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });
    
    if (signInError) {
      console.error('Login failed:', signInError.message);
      return false;
    }
    
    console.log('Login successful!');
    console.log('User:', {
      id: signInData.user.id,
      email: signInData.user.email
    });
    return true;
  } catch (error) {
    console.error('Exception during user creation:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('Supabase User Creation Test');
  console.log('===========================');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');
  
  await createUser();
  
  console.log('\nTest completed');
}

// Run the main function
main();
