import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add connection validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error('Supabase connection not configured. Please click "Connect to Supabase" button.');
}

// Create Supabase client with default configuration
// Using minimal configuration to avoid potential issues
console.log('Creating Supabase client with URL:', supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'undefined');
console.log('Anon key available:', !!supabaseAnonKey);
console.log('Anon key first 10 chars:', supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'undefined');

// Log the full anon key for debugging (remove in production)
console.log('DEBUG - Full anon key:', supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Changed to true to properly handle OAuth redirects
    debug: true // Enable debug mode to see more auth logs
  }
});

// Get the service role key from environment variables
// This is used for operations that require bypassing RLS
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// Create a service role client for admin operations
// This client can bypass RLS policies
console.log('Service role key available:', !!supabaseServiceKey);
console.log('Service role key first 10 chars:', supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + '...' : 'undefined');

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      debug: true // Enable debug mode to see more auth logs
    }
  })
  : null;

// Log Supabase client initialization
console.log('Supabase client initialized with URL:',
  supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'undefined');
console.log('Supabase admin client available:', !!supabaseAdmin);

// Test connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('products').select('count');
    if (error) throw error;
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
};