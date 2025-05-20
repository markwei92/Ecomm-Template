// Script to delete a user using the Supabase Dashboard API directly
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

console.log(`Deleting user with email: ${email}`);
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key (first 10 chars): ${supabaseKey.substring(0, 10)}...`);

async function deleteUserWithDashboardAPI() {
  try {
    // First, try to delete directly from auth.users using the REST API
    console.log('Trying direct REST API deletion...');
    
    // Try to delete from auth.users table
    const authDeleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (authDeleteResponse.ok) {
      console.log('Successfully deleted from auth.users table');
      return;
    }
    
    console.log(`Failed to delete from auth.users table: ${authDeleteResponse.status} ${authDeleteResponse.statusText}`);
    
    // Try another endpoint
    const authDeleteResponse2 = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (authDeleteResponse2.ok) {
      console.log('Successfully deleted from auth.users table with alternative endpoint');
      return;
    }
    
    console.log(`Failed to delete from auth.users table with alternative endpoint: ${authDeleteResponse2.status} ${authDeleteResponse2.statusText}`);
    
    // Try to get the user ID first
    console.log('Trying to get user ID...');
    
    // Try to get the user ID using the auth API
    const getUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=eq.${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (getUserResponse.ok) {
      const userData = await getUserResponse.json();
      
      if (userData && userData.length > 0) {
        const userId = userData[0].id;
        console.log(`Found user ID: ${userId}`);
        
        // Try to delete the user with the ID
        const deleteByIdResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (deleteByIdResponse.ok) {
          console.log('Successfully deleted user by ID');
          return;
        }
        
        console.log(`Failed to delete user by ID: ${deleteByIdResponse.status} ${deleteByIdResponse.statusText}`);
      } else {
        console.log('User not found in auth.users');
      }
    } else {
      console.log(`Failed to get user ID: ${getUserResponse.status} ${getUserResponse.statusText}`);
    }
    
    // Try to delete from all possible tables using the REST API
    console.log('Trying to delete from all tables...');
    
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
    
    // Try to use the Supabase client directly
    console.log('Trying to use Supabase client directly...');
    
    // Create a simple HTML file that uses the Supabase client to delete the user
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Delete User</title>
  <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
</head>
<body>
  <h1>Delete User</h1>
  <div id="result"></div>
  
  <script>
    // Create Supabase client
    const supabaseUrl = '${supabaseUrl}';
    const supabaseKey = '${supabaseKey}';
    const supabase = supabase.createClient(supabaseUrl, supabaseKey);
    
    // Function to delete user
    async function deleteUser() {
      try {
        // Try to delete the user with the admin API
        const { error } = await supabase.auth.admin.deleteUser('${email}');
        
        if (error) {
          document.getElementById('result').innerHTML = 'Error: ' + error.message;
        } else {
          document.getElementById('result').innerHTML = 'User deleted successfully';
        }
      } catch (error) {
        document.getElementById('result').innerHTML = 'Exception: ' + error.message;
      }
    }
    
    // Delete the user
    deleteUser();
  </script>
</body>
</html>
    `;
    
    // Write the HTML file
    fs.writeFileSync('delete-user.html', htmlContent);
    console.log('Created delete-user.html file. Please open it in a browser to delete the user.');
    
    if (deletedFromAny) {
      console.log(`Successfully deleted user ${email} from one or more tables`);
    } else {
      console.log(`Failed to delete user ${email} from any table`);
      console.log('Please try opening the delete-user.html file in a browser to delete the user.');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteUserWithDashboardAPI();
