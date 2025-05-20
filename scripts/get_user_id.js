// This script helps you find your user ID
// Run with: node scripts/get_user_id.js your-email@example.com

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Please provide your email as a command line argument.');
  console.log('Usage: node scripts/get_user_id.js your-email@example.com');
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key. Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to find user ID by email
async function getUserIdByEmail() {
  try {
    // Try to sign in with email (this won't actually sign in, just check if the user exists)
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false
      }
    });

    if (error && error.message !== 'Email link sent') {
      console.error('Error checking user:', error);
      console.log('The user might not exist or there might be an issue with the Supabase connection.');
      return;
    }

    console.log('A magic link has been sent to your email.');
    console.log('Please check your email and click the link to sign in.');
    console.log('After signing in, you can find your user ID in the browser console by running:');
    console.log('');
    console.log('const { data } = await supabase.auth.getUser()');
    console.log('console.log(data.user.id)');
    console.log('');
    console.log('Or by going to your account page and checking the browser console.');
    
  } catch (error) {
    console.error('Error finding user ID:', error);
  }
}

// Run the function
getUserIdByEmail();
