// This script tests if email confirmation is the issue
// Run with: node test-email-confirmation.js

import { createClient } from '@supabase/supabase-js';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxMTM0MiwiZXhwIjoyMDYyODg3MzQyfQ.g2vtZrwh8bsNrNVkQ4UbvLshfPQYdBej3NkrU28JpPA';

// Create Supabase clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Test user email to check
const testEmail = 'test15@test15.com';

// Function to check user details
async function checkUserDetails() {
  console.log(`Checking user details for: ${testEmail}`);
  
  try {
    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, email_confirmed_at, confirmation_sent_at, created_at, last_sign_in_at')
      .eq('email', testEmail)
      .single();
      
    if (authError) {
      console.error('Error checking auth user:', authError.message);
    } else if (authUser) {
      console.log('User found in auth.users:');
      console.log(authUser);
      
      // Check if email is confirmed
      if (authUser.email_confirmed_at) {
        console.log('Email is confirmed at:', authUser.email_confirmed_at);
      } else {
        console.log('Email is NOT confirmed!');
        
        // Try to confirm the email
        console.log('Attempting to confirm email...');
        
        try {
          // Update the user to confirm their email
          const { data: updateData, error: updateError } = await supabaseAdmin
            .rpc('admin_confirm_user', { user_email: testEmail });
            
          if (updateError) {
            console.error('Error confirming email:', updateError.message);
          } else {
            console.log('Email confirmed successfully:', updateData);
          }
        } catch (confirmError) {
          console.error('Exception during email confirmation:', confirmError.message);
        }
      }
    } else {
      console.log('User not found in auth.users');
    }
    
    // Try to get user details using the SQL function
    const { data: userData, error: userError } = await supabaseAdmin
      .rpc('get_auth_user_details', { user_email: testEmail });
      
    if (userError) {
      console.error('Error getting user details with SQL function:', userError.message);
    } else {
      console.log('User details from SQL function:');
      console.log(userData);
    }
    
    // Try to reset the password
    console.log('\nAttempting to reset password...');
    const { data: resetData, error: resetError } = await supabaseAdmin
      .rpc('admin_reset_password', { 
        user_email: testEmail,
        new_password: 'Password123'
      });
      
    if (resetError) {
      console.error('Error resetting password:', resetError.message);
    } else {
      console.log('Password reset successfully:', resetData);
      
      // Try to sign in with the new password
      console.log('\nTrying to sign in with new password...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'Password123'
      });
      
      if (signInError) {
        console.error('Sign in failed:', signInError.message);
      } else {
        console.log('Sign in successful!');
        console.log('User:', {
          id: signInData.user.id,
          email: signInData.user.email
        });
      }
    }
  } catch (error) {
    console.error('Exception during user check:', error.message);
  }
}

// Function to create admin_confirm_user function if it doesn't exist
async function createConfirmUserFunction() {
  console.log('Creating admin_confirm_user function...');
  
  try {
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION admin_confirm_user(user_email TEXT)
      RETURNS JSONB AS $$
      DECLARE
        result JSONB;
      BEGIN
        UPDATE auth.users
        SET email_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE email = user_email;
        
        IF FOUND THEN
          result := json_build_object(
            'success', true,
            'message', 'Email confirmed successfully'
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
    
    const { data, error } = await supabaseAdmin
      .rpc('run_sql', { sql: createFunctionSQL });
      
    if (error) {
      console.error('Error creating function:', error.message);
    } else {
      console.log('Function created successfully');
    }
  } catch (error) {
    console.error('Exception creating function:', error.message);
  }
}

// Main function
async function main() {
  console.log('Supabase Email Confirmation Test');
  console.log('===============================');
  console.log('URL:', supabaseUrl);
  console.log('Service Key (first 10 chars):', supabaseServiceKey.substring(0, 10) + '...');
  
  // Create the confirm user function
  await createConfirmUserFunction();
  
  // Check user details
  await checkUserDetails();
  
  console.log('\nTest completed');
}

// Run the main function
main();
