// Script to reset a user's password using the SQL function
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Email to reset password for
const userEmail = 'necixed240@jazipo.com';
// New password to set
const newPassword = 'Password123';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetPasswordWithSQL() {
  try {
    console.log(`Attempting to reset password for: ${userEmail}`);

    // Call the SQL function
    const { data, error } = await supabase
      .rpc('admin_reset_password', {
        user_email: userEmail,
        new_password: newPassword
      });

    if (error) {
      console.error('Error resetting password with SQL function:', error);
      return;
    }

    console.log('Password reset successful!');
    console.log('Result:', data);

    // Try to sign in with the new password to verify it works
    console.log('\nTrying to sign in with new password...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: newPassword
    });

    if (signInError) {
      console.error('Sign in failed:', signInError);
      return;
    }

    console.log('Sign in successful! Password reset worked.');
    console.log('User can now log in with:');
    console.log(`Email: ${userEmail}`);
    console.log(`Password: ${newPassword}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPasswordWithSQL();
