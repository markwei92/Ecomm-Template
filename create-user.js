// Script to create a new user with the admin API
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// User details
const userEmail = 'necixed240@jazipo.com';
const userPassword = 'Password123';
const firstName = 'Test';
const lastName = 'User';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser() {
  try {
    console.log(`Attempting to create user: ${userEmail}`);
    
    // First check if user exists in custom users table
    console.log('Checking if user exists in custom users table...');
    const { data: customUsers, error: customUsersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail);
    
    if (customUsersError) {
      console.error('Error checking custom users table:', customUsersError);
    } else if (customUsers && customUsers.length > 0) {
      console.log('User already exists in custom users table:', customUsers[0]);
    } else {
      console.log('User not found in custom users table');
    }
    
    // Create user with admin API
    console.log('\nCreating user with admin API...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`
      }
    });
    
    if (error) {
      console.error('Error creating user:', error);
      return;
    }
    
    console.log('User created successfully!');
    console.log('User details:', data.user);
    
    // Try to sign in with the new user
    console.log('\nTrying to sign in with new user...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });
    
    if (signInError) {
      console.error('Sign in failed:', signInError);
      return;
    }
    
    console.log('Sign in successful!');
    console.log('User can now log in with:');
    console.log(`Email: ${userEmail}`);
    console.log(`Password: ${userPassword}`);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

createUser();
