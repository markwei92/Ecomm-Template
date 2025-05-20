import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = resolve(__dirname, '.env.local');
try {
  const envConfig = readFileSync(envPath, 'utf8');
  const env = dotenv.parse(envConfig);

  // Set environment variables
  for (const key in env) {
    process.env[key] = env[key];
  }
} catch (err) {
  console.error('Error loading .env.local file:', err);
}

// Get Supabase credentials from environment variables
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
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDirectLogin() {
  try {
    const email = 'necixed240@jazipo.com';
    const password = '123456';

    console.log(`Testing direct login with email: ${email}`);

    // First check if the user exists
    console.log('Checking if user exists...');
    try {
      const { data: users, error: userError } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', email);

      if (userError) {
        console.error('Error checking if user exists:', userError);
      } else {
        console.log('User query result:', users);
      }
    } catch (e) {
      console.error('Exception checking user:', e);
    }

    // Try to sign in with Supabase Auth
    console.log('Attempting to sign in...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login failed:', error);
        return;
      }

      console.log('Login successful!');
      console.log('User:', data.user ? {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at
      } : 'No user data');
      console.log('Session:', data.session ? 'Present' : 'None');
    } catch (signInError) {
      console.error('Exception during sign in:', signInError);
    }
  } catch (error) {
    console.error('Exception during login test:', error);
  }
}

// Run the test
testDirectLogin();
