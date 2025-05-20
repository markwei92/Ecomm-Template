// This script sets up the initial popup banner settings in the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPopupBanner() {
  console.log('Setting up popup banner...');

  try {
    // Check if site_settings table exists
    try {
      const { data: tableExists, error: tableCheckError } = await supabase
        .from('site_settings')
        .select('count(*)', { count: 'exact', head: true });

      if (tableCheckError && tableCheckError.code !== 'PGRST116') {
        console.log('Error checking site_settings table, but continuing anyway:', tableCheckError);
      }
    } catch (error) {
      console.log('Error checking site_settings table, but continuing anyway:', error);
    }

    // Check if popup banner settings already exist
    const { data: existingSettings, error: checkError } = await supabase
      .from('site_settings')
      .select('*')
      .eq('setting_key', 'popup_banner')
      .single();

    if (!checkError && existingSettings) {
      console.log('Popup banner settings already exist:', existingSettings);
      return;
    }

    // Set up the popup banner settings
    const popupBannerSettings = {
      setting_key: 'popup_banner',
      setting_value: {
        is_enabled: true,
        layout: 'square',
        rounded_edges: true,
        image_url: '',
        background_color: '#ffffff',
        content: '<div style="text-align: center; width: 100%; padding: 20px;"><h2 style="font-size: 24px; color: #000000; margin-bottom: 10px; font-weight: bold;">Welcome to FunnyJokeTees!</h2><p style="font-size: 16px; color: #333333;">Check out our latest collection of funny t-shirts.</p></div>',
        title: 'Welcome to FunnyJokeTees!',
        description: 'Check out our latest collection of funny t-shirts.',
        titleColor: '#000000',
        titleSize: '24px',
        descriptionColor: '#333333',
        descriptionSize: '16px'
      }
    };

    // Upsert the popup banner settings
    const { error: upsertError } = await supabase
      .from('site_settings')
      .upsert(popupBannerSettings, { onConflict: 'setting_key' });

    if (upsertError) {
      console.error('Error upserting popup banner settings:', upsertError);
      return;
    }

    console.log('Popup banner settings set up successfully!');
  } catch (error) {
    console.error('Error setting up popup banner:', error);
  }
}

// Run the setup function
setupPopupBanner()
  .then(() => {
    console.log('Setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
