// Direct password reset script using the application's Supabase client
import { supabase } from './src/lib/supabase.js';

// User details
const userEmail = 'necixed240@jazipo.com';
const newPassword = 'Password123';

async function directReset() {
  try {
    console.log(`Attempting to reset password for: ${userEmail}`);
    
    // Try to sign in first to see if the user exists
    console.log('Trying to sign in to check if user exists...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: 'anypassword' // We expect this to fail, but it will tell us if the user exists
    });
    
    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('User exists but password is incorrect (expected)');
      } else if (signInError.message.includes('Email not confirmed')) {
        console.log('User exists but email is not confirmed');
      } else {
        console.error('Error signing in:', signInError);
        return;
      }
    } else {
      console.log('Sign in successful (unexpected):', signInData);
    }
    
    // Send password reset email
    console.log('\nSending password reset email...');
    const { data, error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin || 'http://localhost:5173'}/reset-password`,
    });
    
    if (error) {
      console.error('Error sending password reset email:', error);
      return;
    }
    
    console.log('Password reset email sent successfully!');
    console.log('Check your email for the reset link.');
    
    // Try direct password reset using SQL function
    console.log('\nTrying direct password reset with SQL function...');
    const { data: sqlResult, error: sqlError } = await supabase
      .rpc('admin_reset_password', {
        user_email: userEmail,
        new_password: newPassword
      });
    
    if (sqlError) {
      console.error('Error resetting password with SQL function:', sqlError);
    } else {
      console.log('Password reset successful with SQL function!');
      console.log('Result:', sqlResult);
      console.log('User can now log in with:');
      console.log(`Email: ${userEmail}`);
      console.log(`Password: ${newPassword}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

directReset();
