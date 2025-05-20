// This script tests creating and logging in with a complex password
// Run with: node test-complex-password.js

import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate a unique email for testing
const testEmail = `test-user-${Date.now()}@example.com`;
// Complex password that meets the requirements
const testPassword = 'Password123';

// Function to create a user
async function createUser() {
  console.log(`Creating user: ${testEmail}`);
  console.log(`With complex password: ${testPassword}`);
  
  try {
    // Try to sign up
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          full_name: 'Test User'
        }
      }
    });
    
    if (error) {
      console.error('User creation failed:', error.message);
      return null;
    }
    
    console.log('User created successfully!');
    console.log('User:', {
      id: data.user.id,
      email: data.user.email
    });
    
    return data.user;
  } catch (error) {
    console.error('Exception during user creation:', error.message);
    return null;
  }
}

// Function to test login
async function testLogin(email, password) {
  console.log(`\nTesting login for: ${email}`);
  console.log(`With password: ${password}`);
  
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
  console.log('Supabase Complex Password Test');
  console.log('=============================');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');
  
  // Create a new user
  const user = await createUser();
  
  if (user) {
    // Test login with the correct complex password
    await testLogin(testEmail, testPassword);
    
    // Test login with a simple password (should fail)
    await testLogin(testEmail, '123456');
  }
  
  console.log('\nTest completed');
}

// Run the main function
main();
