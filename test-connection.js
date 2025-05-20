// This script tests the Supabase connection with the environment variables
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '.env.local') });

// Get environment variables
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

// Test connection
async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    console.log('Using URL:', supabaseUrl);
    console.log('Using Anon Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');

    // First try a simple query
    console.log('Attempting to query products table...');
    const { data, error } = await supabase.from('products').select('count');

    if (error) {
      console.error('Connection test failed:', error);
      return false;
    }

    console.log('Connection successful! Data:', data);

    // Try to get auth user
    console.log('Attempting to check auth configuration...');
    const authResponse = await supabase.auth.getSession();
    console.log('Auth response:', authResponse);

    return true;
  } catch (error) {
    console.error('Exception during connection test:', error);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    console.log('Test completed with result:', success ? 'SUCCESS' : 'FAILURE');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
