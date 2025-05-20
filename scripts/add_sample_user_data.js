// This script adds sample user data to the database for testing
// Run with: npm run add-user-data -- your-user-id
// Or: node scripts/add_sample_user_data.js your-user-id

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID as a command line argument.');
  console.log('Usage: npm run add-user-data -- your-user-id');
  console.log('Or: node scripts/add_sample_user_data.js your-user-id');
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

// Function to add sample user data
async function addSampleUserData() {
  try {
    // Check if the user exists
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error finding user:', userError);
      console.log('Using provided user ID without verification.');
    }

    console.log(`Adding sample data for user ID: ${userId}`);

    // Add profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890',
        avatar_url: 'https://i.pravatar.cc/150?u=' + userId
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error adding profile:', profileError);
    } else {
      console.log('Profile added:', profile);
    }

    // Add default address
    const { data: address, error: addressError } = await supabase
      .from('user_addresses')
      .upsert({
        user_id: userId,
        name: 'Home',
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94105',
        country: 'US',
        is_default: true
      })
      .select()
      .single();

    if (addressError) {
      console.error('Error adding address:', addressError);
    } else {
      console.log('Address added:', address);
    }

    // Add payment method
    const { data: paymentMethod, error: paymentMethodError } = await supabase
      .from('user_payment_methods')
      .upsert({
        user_id: userId,
        payment_type: 'card',
        cardholder_name: 'John Doe',
        last_four: '4242',
        expiry_date: '12/25',
        is_default: true
      })
      .select()
      .single();

    if (paymentMethodError) {
      console.error('Error adding payment method:', paymentMethodError);
    } else {
      console.log('Payment method added:', paymentMethod);
    }

    console.log('Sample user data added successfully!');

  } catch (error) {
    console.error('Error adding sample user data:', error);
  }
}

// Run the function
addSampleUserData();
