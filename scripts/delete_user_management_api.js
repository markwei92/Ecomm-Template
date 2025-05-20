// Script to delete a user using the Supabase Management API directly
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

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

// Extract the project reference from the URL
const projectRef = supabaseUrl.split('.')[0].replace('https://', '');

console.log(`Deleting user with email: ${email}`);
console.log(`Project Ref: ${projectRef}`);
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key (first 10 chars): ${supabaseKey.substring(0, 10)}...`);

async function deleteUserWithManagementAPI() {
  try {
    // First, try to get all users to find the one with the specified email
    console.log('Fetching users from Management API...');
    
    const getUsersResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/auth/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getUsersResponse.ok) {
      console.error(`Error fetching users: ${getUsersResponse.status} ${getUsersResponse.statusText}`);
      console.error(await getUsersResponse.text());
      throw new Error('Failed to fetch users from Management API');
    }
    
    const users = await getUsersResponse.json();
    console.log(`Found ${users.length || 0} users`);
    
    // Find the user with the specified email
    const user = users.find(u => u.email === email);
    
    if (user) {
      console.log(`Found user with ID: ${user.id}`);
      
      // Delete the user using the Management API
      console.log('Deleting user with Management API...');
      const deleteResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/auth/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) {
        console.error(`Error deleting user: ${deleteResponse.status} ${deleteResponse.statusText}`);
        console.error(await deleteResponse.text());
        throw new Error('Failed to delete user with Management API');
      }
      
      console.log('Successfully deleted user with Management API');
      return;
    } else {
      console.log(`User with email ${email} not found in Management API`);
    }
    
    // If we couldn't find the user, try a different approach
    console.log('Trying alternative approach...');
    
    // Try to delete the user directly by email
    const deleteByEmailResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/auth/users?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (deleteByEmailResponse.ok) {
      console.log('Successfully deleted user by email with Management API');
      return;
    }
    
    console.error(`Error deleting user by email: ${deleteByEmailResponse.status} ${deleteByEmailResponse.statusText}`);
    
    // Try one more approach - use the direct Postgres API
    console.log('Trying Postgres API...');
    
    // Create a SQL query to delete the user
    const sqlQuery = `
      BEGIN;
      -- Disable triggers temporarily
      SET session_replication_role = 'replica';
      
      -- Delete from all related tables
      DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE email = '${email}'));
      DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE email = '${email}');
      DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = '${email}');
      DELETE FROM auth.users WHERE email = '${email}';
      
      -- Re-enable triggers
      SET session_replication_role = 'origin';
      COMMIT;
    `;
    
    // Execute the SQL query using the Postgres API
    const postgresResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: sqlQuery
      })
    });
    
    if (postgresResponse.ok) {
      console.log('Successfully deleted user with Postgres API');
      return;
    }
    
    console.error(`Error deleting user with Postgres API: ${postgresResponse.status} ${postgresResponse.statusText}`);
    console.error(await postgresResponse.text());
    
    // If all else fails, try to use the direct REST API
    console.log('Trying direct REST API...');
    
    // Try to delete from all possible tables
    const tables = ['users', 'profiles', 'auth.users'];
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
    
    if (deletedFromAny) {
      console.log(`Successfully deleted user ${email} from one or more tables`);
    } else {
      console.error(`Failed to delete user ${email} from any table`);
      throw new Error('All deletion methods failed');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteUserWithManagementAPI();
