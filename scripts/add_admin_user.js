// This script adds an admin user to the admin_users table
// Usage: node scripts/add_admin_user.js admin@example.com

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addAdminUser() {
  try {
    // Get email from command line arguments
    const email = process.argv[2];

    if (!email) {
      console.error('Error: Please provide an email address');
      console.log('Usage: node scripts/add_admin_user.js admin@example.com');
      process.exit(1);
    }

    // Check if the admin_users table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') { // Table doesn't exist
      console.log('Creating admin_users table...');

      // Read and execute the SQL script
      const sqlScript = fs.readFileSync('./scripts/create_admin_table.sql', 'utf8');
      const { error: sqlError } = await supabase.rpc('execute_sql', {
        sql_query: sqlScript
      });

      if (sqlError) {
        console.error('Error creating admin_users table:', sqlError);

        // Try to create the table directly
        const { error: createError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS public.admin_users (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              role TEXT DEFAULT 'admin',
              UNIQUE(user_id)
            );
          `
        });

        if (createError) {
          console.error('Error creating admin_users table directly:', createError);
          process.exit(1);
        }
      }
    }

    // Try to get user ID using SQL query
    console.log(`Looking for user with email: ${email}`);

    let userId;

    try {
      // Execute SQL to get user ID
      const { data: userData, error: sqlError } = await supabase.rpc('execute_sql', {
        sql_query: `SELECT id FROM auth.users WHERE email = '${email}'`
      });

      if (sqlError || !userData || userData.length === 0) {
        console.error('Error finding user:', sqlError || 'No user found');

        // Try to get from auth.users directly using admin API
        try {
          console.log('Trying alternative approach with admin API...');
          const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

          if (authError) {
            console.error('Error finding user with admin API:', authError);
            process.exit(1);
          }

          const user = authData.users.find(u => u.email === email);

          if (!user) {
            console.error(`User with email ${email} not found`);
            process.exit(1);
          }

          userId = user.id;
          console.log(`Found user with ID (admin API): ${userId}`);
        } catch (adminError) {
          console.error('Error with admin API:', adminError);
          process.exit(1);
        }
      } else {
        userId = userData[0].id;
        console.log(`Found user with ID (SQL): ${userId}`);
      }
    } catch (error) {
      console.error('Error executing SQL query:', error);
      process.exit(1);
    }

    if (!userId) {
      console.error('Could not determine user ID');
      process.exit(1);
    }

    // Check if user is already an admin
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!checkError && existingAdmin) {
      console.log(`User ${email} is already an admin`);
      return;
    }

    // Add user to admin_users table
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .insert({ user_id: userId })
      .select();

    if (adminError) {
      console.error('Error adding admin user:', adminError);
      process.exit(1);
    }

    console.log(`User ${email} (${userId}) added as admin successfully`);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

addAdminUser();
