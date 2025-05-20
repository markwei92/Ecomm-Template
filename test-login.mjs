import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944';

console.log('Supabase Configuration:');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? 'Present (first 10 chars): ' + supabaseAnonKey.substring(0, 10) + '...' : 'Missing');

// Create Supabase client with anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDirectLogin() {
  try {
    const email = 'necixed240@jazipo.com';
    const password = '123456';

    console.log(`Testing direct login with email: ${email}`);

    // First test a simple query to make sure the connection works
    console.log('Testing connection with a simple query...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('products')
        .select('count');

      if (testError) {
        console.error('Test query failed:', testError);
      } else {
        console.log('Test query succeeded:', testData);
      }
    } catch (e) {
      console.error('Exception during test query:', e);
    }

    // Try to sign in with Supabase Auth
    console.log('Attempting to sign in...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('Sign in response received');

      if (error) {
        console.error('Login failed:', error);
        return;
      }

      console.log('Login successful!');
      console.log('User:', data.user ? {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at
      } : 'No user data');
      console.log('Session:', data.session ? 'Present' : 'None');
    } catch (signInError) {
      console.error('Exception during sign in:', signInError);
    }
  } catch (error) {
    console.error('Exception during login test:', error);
  }

  console.log('Test completed');
}

// Run the test
testDirectLogin();
