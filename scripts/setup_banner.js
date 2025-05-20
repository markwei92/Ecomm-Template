// This script sets up the announcement banner in the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBanner() {
  console.log('Setting up announcement banner...');

  try {
    // Check if site_settings table exists
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('site_settings')
      .select('count(*)', { count: 'exact', head: true });

    if (tableCheckError && tableCheckError.code !== 'PGRST116') {
      // If error is not "no rows returned", it might be that the table doesn't exist
      console.log('Creating site_settings table...');

      // Create the table
      const { error: createTableError } = await supabase.rpc('create_site_settings_table');

      if (createTableError) {
        console.error('Error creating site_settings table:', createTableError);
        return;
      }
    }

    // Set up the banner settings
    const bannerSettings = {
      setting_key: 'announcement_banner',
      setting_value: {
        message: '30 DAYS NO REASON RETURN · 180 DAYS QUALITY OF EXCHANGE OR REFUND · LOWEST PRICE GUARANTEE · 7 DAYS DOA PRODUCT GUARANTEE',
        is_enabled: true
      }
    };

    // Upsert the banner settings
    const { error: upsertError } = await supabase
      .from('site_settings')
      .upsert(bannerSettings, { onConflict: 'setting_key' });

    if (upsertError) {
      console.error('Error upserting banner settings:', upsertError);
      return;
    }

    console.log('Banner settings set up successfully!');
  } catch (error) {
    console.error('Error setting up banner:', error);
  }
}

// Run the setup
setupBanner()
  .then(() => {
    console.log('Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
