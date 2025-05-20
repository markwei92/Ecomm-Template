import { supabase } from '../lib/supabase';
import { clearSupabaseCache } from './carouselService';

/**
 * Upload banner image to Supabase storage
 */
export const uploadBannerImage = async (file: File): Promise<string> => {
  console.log('Uploading banner image:', file.name);

  // Check if user is authenticated
  const { data } = await supabase.auth.getSession();
  const authenticated = !!data.session;
  
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to upload banner images');
  }

  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `popup-banner-${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading banner image:', uploadError);
      throw new Error(`Failed to upload banner image: ${uploadError.message || 'Unknown error'}`);
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadBannerImage:', error);
    throw error;
  }
};

/**
 * Fetch popup banner settings
 */
export const fetchPopupBannerSettings = async () => {
  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'popup_banner')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching popup banner settings:', error);
      throw new Error(`Failed to fetch popup banner settings: ${error.message || 'Unknown error'}`);
    }

    return data?.setting_value || null;
  } catch (error) {
    console.error('Error in fetchPopupBannerSettings:', error);
    throw error;
  }
};

/**
 * Update popup banner settings
 */
export const updatePopupBannerSettings = async (settings: any) => {
  try {
    // Check if user is authenticated
    const { data } = await supabase.auth.getSession();
    const authenticated = !!data.session;
    
    if (!authenticated) {
      console.error('User is not authenticated');
      throw new Error('You must be logged in to update banner settings');
    }

    // Refresh the session before making the request
    await clearSupabaseCache();

    const { error } = await supabase
      .from('site_settings')
      .upsert({
        setting_key: 'popup_banner',
        setting_value: settings
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Error updating popup banner settings:', error);
      throw new Error(`Failed to update popup banner settings: ${error.message || 'Unknown error'}`);
    }

    return true;
  } catch (error) {
    console.error('Error in updatePopupBannerSettings:', error);
    throw error;
  }
};
