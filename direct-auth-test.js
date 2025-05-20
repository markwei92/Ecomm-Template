// This script directly tests Supabase authentication
// Run with: node direct-auth-test.js

import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test users
const testUsers = [
  { email: 'necixed240@jazipo.com', password: '123456' },
  { email: 'test2@test2.com', password: '123456' },
  { email: 'test3@test3.com', password: '123456' }
];

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

// Main function to run tests
async function runTests() {
  console.log('Supabase Authentication Test');
  console.log('===========================');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');

  // Test each user
  for (const user of testUsers) {
    await testLogin(user.email, user.password);
  }

  console.log('\nTests completed');
}

// Run the tests
runTests();
