// This script tests the Supabase connection
// Run with: node scripts/test_supabase_connection.js

// Use CommonJS require instead of import
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const process = require('process');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase Configuration:');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? 'Present (first 10 chars): ' + supabaseAnonKey.substring(0, 10) + '...' : 'Missing');
console.log('Service Key:', supabaseServiceKey ? 'Present (first 10 chars): ' + supabaseServiceKey.substring(0, 10) + '...' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or anon key in environment variables');
  process.exit(1);
}

// Create Supabase client with anon key
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Create Supabase client with service role key (if available)
const supabaseService = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function testConnection() {
  try {
    console.log('\nTesting connection with anon key...');

    // Test public data access
    const { data: publicData, error: publicError } = await supabaseAnon
      .from('products')
      .select('count');

    if (publicError) {
      console.error('Error accessing public data:', publicError);
    } else {
      console.log('Successfully accessed public data:', publicData);
    }

    // Test authentication
    console.log('\nTesting authentication...');
    const testEmail = 'funnyjoketees@gmail.com'; // Use your email
    const testPassword = 'NewPassword123!'; // Use the password you set

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (authError) {
      console.error('Authentication error:', authError);
    } else {
      console.log('Authentication successful:', {
        user: authData.user ? {
          id: authData.user.id,
          email: authData.user.email,
          created_at: authData.user.created_at
        } : null,
        session: authData.session ? 'Present' : 'Missing'
      });

      // Test admin access
      if (authData.user) {
        console.log('\nTesting admin access...');
        const { data: adminData, error: adminError } = await supabaseAnon
          .from('admin_users')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();

        if (adminError) {
          console.error('Error checking admin status:', adminError);
        } else {
          console.log('Admin check successful:', adminData);
        }
      }
    }

    // Test service role access (if available)
    if (supabaseService) {
      console.log('\nTesting service role access...');

      // List users with service role
      const { data: usersData, error: usersError } = await supabaseService.auth.admin.listUsers();

      if (usersError) {
        console.error('Error listing users with service role:', usersError);
      } else {
        console.log('Successfully listed users with service role:', {
          count: usersData.users.length,
          sample: usersData.users.slice(0, 2).map(u => ({ id: u.id, email: u.email }))
        });
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testConnection();
