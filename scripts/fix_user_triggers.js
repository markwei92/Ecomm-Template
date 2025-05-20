import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUserTriggers() {
  console.log('Starting to fix user triggers...');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'supabase', 'migrations', '20250615000000_fix_user_triggers.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: sqlContent
    });

    if (error) {
      console.error('Error executing SQL:', error);
      return;
    }

    console.log('Successfully fixed user triggers!');

    // Verify the trigger exists
    const { data: triggers, error: triggerError } = await supabase.rpc('execute_sql', {
      sql_query: "SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created'"
    });

    if (triggerError) {
      console.error('Error verifying trigger:', triggerError);
    } else {
      console.log('Trigger verification:', triggers);
    }

  } catch (error) {
    console.error('Error fixing user triggers:', error);
  }
}

fixUserTriggers()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
