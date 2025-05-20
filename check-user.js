// Script to check a user's status in Supabase
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Email to check
const userEmail = 'necixed240@jazipo.com';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
  try {
    console.log(`Checking user status for: ${userEmail}`);

    // Check if user exists in auth.users
    console.log('\nChecking if user exists in auth.users...');
    const { data: userExists, error: userExistsError } = await supabase
      .rpc('auth_user_exists', { user_email: userEmail });

    if (userExistsError) {
      console.error('Error checking if user exists:', userExistsError);
    } else {
      console.log('User exists in auth.users:', userExists);
    }

    // Get user details if they exist
    if (userExists) {
      console.log('\nGetting user details from auth.users...');
      const { data: userDetails, error: userDetailsError } = await supabase
        .rpc('get_auth_user_details', { user_email: userEmail });

      if (userDetailsError) {
        console.error('Error getting user details:', userDetailsError);
      } else {
        console.log('User details:', userDetails);
      }
    }

    // Check if user exists in custom users table
    console.log('\nChecking if user exists in custom users table...');
    const { data: customUsers, error: customUsersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail);

    if (customUsersError) {
      console.error('Error checking custom users table:', customUsersError);
    } else if (!customUsers || customUsers.length === 0) {
      console.log('User not found in custom users table');
    } else {
      console.log('User found in custom users table:', customUsers[0]);
    }

    // Try to get user by email using admin API
    console.log('\nTrying to get user with admin API...');
    const { data: adminUsers, error: adminError } = await supabase.auth.admin.listUsers();

    if (adminError) {
      console.error('Error listing users with admin API:', adminError);
    } else {
      const user = adminUsers.users.find(u => u.email === userEmail);
      if (user) {
        console.log('User found with admin API:', user);
      } else {
        console.log('User not found with admin API');
      }
    }
  } catch (error) {
    console.error('Error checking user:', error);
  }
}

checkUser();
