// This script adds an admin user using JWT authentication
// Run with: node scripts/add_admin_with_jwt.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

// Get Supabase URL and JWT secret
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const jwtSecret = process.env.JWT_SECRET; // Add this to your .env file

if (!supabaseUrl || !jwtSecret) {
  console.error('Missing Supabase URL or JWT secret in environment variables');
  console.error('Add JWT_SECRET=your_jwt_secret to your .env file');
  process.exit(1);
}

// Create a custom JWT token with admin claims
function createAdminToken() {
  const payload = {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
  };

  return jwt.sign(payload, jwtSecret);
}

// Create Supabase client with custom JWT
const adminToken = createAdminToken();
const supabase = createClient(supabaseUrl, adminToken, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addAdminUser() {
  try {
    // Email and password for the admin user
    const adminEmail = 'admin@example.com'; // Change this to your desired email
    const adminPassword = 'AdminPassword123!'; // Change this to your desired password

    console.log(`Creating/updating admin user: ${adminEmail}`);

    // First, check if the user exists
    const { data: existingUsers, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', adminEmail);

    if (userError) {
      console.error('Error checking for existing user:', userError);

      // Try alternative approach with direct SQL
      console.log('Trying alternative approach...');

      // Create user if they don't exist
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true
      });

      if (createError) {
        console.error('Error creating user:', createError);
        process.exit(1);
      }

      console.log('User created successfully:', userData.user.id);

      // Add user to admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .insert({ user_id: userData.user.id })
        .select();

      if (adminError) {
        console.error('Error adding admin user:', adminError);
        process.exit(1);
      }

      console.log('User added as admin successfully');
    } else {
      // User exists, update their password
      const userId = existingUsers[0]?.id;

      if (!userId) {
        console.error('User exists but ID not found');
        process.exit(1);
      }

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: adminPassword }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        process.exit(1);
      }

      console.log('Password updated successfully');

      // Check if user is already an admin
      const { data: adminCheck, error: checkError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking admin status:', checkError);
      }

      if (!adminCheck) {
        // Add user to admin_users table
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .insert({ user_id: userId })
          .select();

        if (adminError) {
          console.error('Error adding admin user:', adminError);
          process.exit(1);
        }

        console.log('User added as admin successfully');
      } else {
        console.log('User is already an admin');
      }
    }

    console.log('\nAdmin user setup complete!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('\nYou can now log in to the admin dashboard with these credentials.');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

addAdminUser();
