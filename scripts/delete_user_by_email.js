// Script to delete a user by email
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get the email from command line arguments
const email = process.argv[2] || 'test7@test7.com';

// Get Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

console.log(`Deleting user with email: ${email}`);
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key (first 10 chars): ${supabaseKey.substring(0, 10)}...`);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteUser() {
  try {
    // First, try to get the user ID
    console.log('Fetching user ID...');
    
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
    } else {
      console.log(`Found ${users.users?.length || 0} users`);
      
      // Find the user with the specified email
      const user = users.users?.find(u => u.email === email);
      
      if (user) {
        console.log(`Found user with ID: ${user.id}`);
        
        // Try to delete the user with the admin API
        console.log('Deleting user with admin API...');
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error('Error deleting user with admin API:', deleteError);
        } else {
          console.log('Successfully deleted user with admin API');
          return;
        }
      } else {
        console.log(`User with email ${email} not found in auth.users`);
      }
    }
    
    // If admin API fails or user not found, try direct REST API calls
    console.log('Trying direct REST API calls...');
    
    // Try to delete from all possible tables
    const tables = ['users', 'profiles', 'cart_items', 'shipping_addresses', 'orders'];
    let deletedFromAny = false;
    
    for (const table of tables) {
      try {
        console.log(`Deleting from ${table} table...`);
        const response = await fetch(`${supabaseUrl}/rest/v1/${table}?email=eq.${encodeURIComponent(email)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        });
        
        if (response.ok) {
          console.log(`Successfully deleted from ${table} table`);
          deletedFromAny = true;
        } else {
          console.log(`Failed to delete from ${table} table: ${response.status} ${response.statusText}`);
        }
      } catch (tableError) {
        console.error(`Error deleting from ${table} table:`, tableError);
      }
    }
    
    // Try to delete directly from auth.users
    try {
      console.log('Deleting from auth.users table...');
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=eq.${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('Successfully deleted from auth.users table');
        deletedFromAny = true;
      } else {
        console.log(`Failed to delete from auth.users table: ${response.status} ${response.statusText}`);
        
        // Try another endpoint
        const response2 = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(email)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (response2.ok) {
          console.log('Successfully deleted from auth.users table with alternative endpoint');
          deletedFromAny = true;
        } else {
          console.log(`Failed to delete from auth.users table with alternative endpoint: ${response2.status} ${response2.statusText}`);
        }
      }
    } catch (authError) {
      console.error('Error deleting from auth.users table:', authError);
    }
    
    if (deletedFromAny) {
      console.log(`Successfully deleted user ${email} from one or more tables`);
    } else {
      console.error(`Failed to delete user ${email} from any table`);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}

// Run the deletion
deleteUser();
