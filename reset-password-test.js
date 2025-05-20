// Script to manually reset a user's password
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service role key in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Email to reset password for
const userEmail = 'necixed240@jazipo.com';
// New password to set
const newPassword = 'Password123';

async function resetPassword() {
  try {
    console.log(`Attempting to reset password for: ${userEmail}`);
    
    // First, check if the user exists in auth.users
    console.log('Checking if user exists in auth.users...');
    const { data: userExists, error: userExistsError } = await supabase
      .rpc('auth_user_exists', { user_email: userEmail });
    
    if (userExistsError) {
      console.error('Error checking if user exists:', userExistsError);
      return;
    }
    
    if (!userExists) {
      console.log('User does not exist in auth.users. Checking custom users table...');
      
      // Check if user exists in custom users table
      const { data: customUsers, error: customUsersError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail);
      
      if (customUsersError) {
        console.error('Error checking custom users table:', customUsersError);
        return;
      }
      
      if (!customUsers || customUsers.length === 0) {
        console.error('User not found in any table');
        return;
      }
      
      console.log('User found in custom users table:', customUsers[0]);
      
      // Update password hash in custom users table
      // This is a simplified example - in a real app, you'd use proper hashing
      console.log('Updating password in custom users table...');
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('email', userEmail);
      
      if (updateError) {
        console.error('Error updating password in custom users table:', updateError);
        return;
      }
      
      console.log('Password updated successfully in custom users table');
      return;
    }
    
    console.log('User exists in auth.users. Attempting to reset password...');
    
    // Try method 1: Using admin.updateUserById
    try {
      console.log('Getting user details...');
      const { data: userDetails, error: userDetailsError } = await supabase
        .rpc('get_auth_user_details', { user_email: userEmail });
      
      if (userDetailsError) {
        console.error('Error getting user details:', userDetailsError);
        throw new Error('Failed to get user details');
      }
      
      if (!userDetails || !userDetails.id) {
        console.error('User details not found');
        throw new Error('User details not found');
      }
      
      console.log('User details:', userDetails);
      
      console.log('Updating password using admin.updateUserById...');
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        userDetails.id,
        { password: newPassword }
      );
      
      if (updateError) {
        console.error('Error updating password with admin.updateUserById:', updateError);
        throw new Error('Failed to update password with admin.updateUserById');
      }
      
      console.log('Password updated successfully with admin.updateUserById');
      return;
    } catch (error) {
      console.error('Method 1 failed:', error.message);
      console.log('Trying method 2...');
    }
    
    // Try method 2: Using SQL function
    try {
      console.log('Resetting password using SQL function...');
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('admin_reset_password', {
          user_email: userEmail,
          new_password: newPassword
        });
      
      if (sqlError) {
        console.error('Error resetting password with SQL function:', sqlError);
        throw new Error('Failed to reset password with SQL function');
      }
      
      console.log('Password reset successful with SQL function');
      return;
    } catch (error) {
      console.error('Method 2 failed:', error.message);
      console.log('Trying method 3...');
    }
    
    // Try method 3: Direct password reset
    try {
      console.log('Sending password reset email...');
      const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
        userEmail,
        { redirectTo: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/reset-password` }
      );
      
      if (resetError) {
        console.error('Error sending password reset email:', resetError);
        throw new Error('Failed to send password reset email');
      }
      
      console.log('Password reset email sent successfully');
      console.log('Note: This method requires the user to click the link in the email');
      return;
    } catch (error) {
      console.error('Method 3 failed:', error.message);
    }
    
    console.error('All password reset methods failed');
  } catch (error) {
    console.error('Error resetting password:', error);
  }
}

resetPassword();
