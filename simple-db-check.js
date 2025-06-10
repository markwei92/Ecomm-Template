// Simple database check
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxMTM0MiwiZXhwIjoyMDYyODg3MzQyfQ.g2vtZrwh8bsNrNVkQ4UbvLshfPQYdBej3NkrU28JpPA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('Checking database tables...');

  // Check addresses table
  try {
    const { data, error } = await supabase.from('addresses').select('*').limit(1);
    if (error) {
      console.log('addresses table error:', error.message);
    } else {
      console.log('addresses table exists, records:', data.length);
    }
  } catch (e) {
    console.log('addresses table check failed:', e.message);
  }

  // Check user_addresses table
  try {
    const { data, error } = await supabase.from('user_addresses').select('*').limit(1);
    if (error) {
      console.log('user_addresses table error:', error.message);
    } else {
      console.log('user_addresses table exists, records:', data.length);
    }
  } catch (e) {
    console.log('user_addresses table check failed:', e.message);
  }

  // Check stripe_orders table
  try {
    const { data, error } = await supabase.from('stripe_orders').select('*').limit(1);
    if (error) {
      console.log('stripe_orders table error:', error.message);
    } else {
      console.log('stripe_orders table exists, records:', data.length);
    }
  } catch (e) {
    console.log('stripe_orders table check failed:', e.message);
  }

  // Check profiles table
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
      console.log('profiles table error:', error.message);
    } else {
      console.log('profiles table exists, records:', data.length);
    }
  } catch (e) {
    console.log('profiles table check failed:', e.message);
  }
}

checkTables();
