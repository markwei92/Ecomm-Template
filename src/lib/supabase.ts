import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add connection validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase connection not configured. Please check environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Get the service role key from environment variables
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// Create a service role client for admin operations
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  : null;

// Test connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('products').select('count');
    if (error) throw error;
    return true;
  } catch (error) {
    return false;
  }
};