// This script creates a new user and tests login
// Run with: node create-and-test-user.js

import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxMTM0MiwiZXhwIjoyMDYyODg3MzQyfQ.g2vtZrwh8bsNrNVkQ4UbvLshfPQYdBej3NkrU28JpPA';

// Create Supabase clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Generate a unique email for testing
const testEmail = `test-user-${Date.now()}@example.com`;
const testPassword = '123456';

// Function to create a user
async function createUser() {
  console.log(`Creating user: ${testEmail}`);
  
  try {
    // Try to sign up using the admin client
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
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
  console.log('Supabase User Creation and Login Test');
  console.log('====================================');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');
  console.log('Service Key (first 10 chars):', supabaseServiceKey.substring(0, 10) + '...');
  
  // Create a new user
  const user = await createUser();
  
  if (user) {
    // Test login with the new user
    await testLogin(testEmail, testPassword);
  }
  
  console.log('\nTest completed');
}

// Run the main function
main();
