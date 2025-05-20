// This script tests resetting a user's password using the admin API
// Run with: node admin-reset-password.js

import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxMTM0MiwiZXhwIjoyMDYyODg3MzQyfQ.g2vtZrwh8bsNrNVkQ4UbvLshfPQYdBej3NkrU28JpPA';

// Create Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// User to reset
const userEmail = 'necixed240@jazipo.com';
const newPassword = '123456';

// Function to reset password
async function resetPassword() {
  console.log(`Resetting password for: ${userEmail}`);

  try {
    // First get the user by email using a direct SQL query
    console.log('Looking up user by email...');
    const { data: users, error: userError } = await supabaseAdmin
      .rpc('get_auth_user_details', { user_email: userEmail });

    if (userError) {
      console.error('Error looking up user:', userError.message);
      return;
    }

    if (!users) {
      console.error('User not found');
      return;
    }

    console.log('User found:', users);

    // Now update the password using the SQL function
    console.log('Updating password using SQL function...');
    const { data, error } = await supabaseAdmin
      .rpc('admin_reset_password', {
        user_email: userEmail,
        new_password: newPassword
      });

    if (error) {
      console.error('Error updating password:', error.message);
      return;
    }

    console.log('Password updated successfully!');
    console.log('Updated user:', {
      id: data.user.id,
      email: data.user.email,
      updated_at: data.user.updated_at
    });

    // Now try to sign in with the new password
    console.log('\nTrying to sign in with new password...');
    const supabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944');

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: newPassword
    });

    if (signInError) {
      console.error('Sign in failed:', signInError.message);
      return;
    }

    console.log('Sign in successful!');
    console.log('User:', {
      id: signInData.user.id,
      email: signInData.user.email
    });
  } catch (error) {
    console.error('Exception during password reset:', error.message);
  }
}

// Main function
async function main() {
  console.log('Supabase Admin Password Reset Test');
  console.log('=================================');
  console.log('URL:', supabaseUrl);
  console.log('Service Key (first 10 chars):', supabaseServiceKey.substring(0, 10) + '...');

  await resetPassword();

  console.log('\nTest completed');
}

// Run the main function
main();
