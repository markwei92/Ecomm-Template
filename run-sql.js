// This script runs SQL directly on the database
// Run with: node run-sql.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Hardcode the values for testing
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxMTM0MiwiZXhwIjoyMDYyODg3MzQyfQ.g2vtZrwh8bsNrNVkQ4UbvLshfPQYdBej3NkrU28JpPA';

// Create Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Function to run SQL
async function runSQL(sql) {
  console.log('Running SQL...');
  
  try {
    // Run the SQL directly
    const { data, error } = await supabaseAdmin
      .rpc('run_sql', { sql });
      
    if (error) {
      console.error('Error running SQL:', error.message);
      return null;
    }
    
    console.log('SQL executed successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception running SQL:', error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('Supabase Run SQL Test');
  console.log('====================');
  console.log('URL:', supabaseUrl);
  console.log('Service Key (first 10 chars):', supabaseServiceKey.substring(0, 10) + '...');
  
  // Read the SQL file
  try {
    const sql = readFileSync('create-auth-user.sql', 'utf8');
    console.log('SQL file read successfully');
    
    // Run the SQL
    await runSQL(sql);
  } catch (error) {
    console.error('Error reading SQL file:', error.message);
  }
  
  console.log('\nTest completed');
}

// Run the main function
main();
