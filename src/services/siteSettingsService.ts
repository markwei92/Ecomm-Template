import { supabase } from '../lib/supabase';
import { clearSupabaseCache } from './carouselService';

// Check if user is authenticated
const isAuthenticated = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
};

// Check if user is an admin
const isAdmin = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) {
      console.error('Error checking if user is admin:', error);
      return false;
    }
    return !!data;
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
};

export interface LogoSettings {
  image_url: string;
  alt_text: string;
  alignment: 'left' | 'center' | 'right';
}

export interface SiteTitleSettings {
  text: string;
  color: string;
}

export interface ThemeColorSettings {
  navbarBackground: string;
  navbarText: string;
  bodyBackground: string;
  footerBackground: string;
  footerText: string;
  footerButtonBackground: string;
  footerButtonText: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  image_url: string;
  enabled: boolean;
  link_url: string;
}

export interface FooterSettings {
  copyright_text: string;
  brand_text: string;
  payment_providers: PaymentProvider[];
}

export interface SiteSetting<T> {
  id: string;
  key: string;
  value: T;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch logo settings
 */
export const fetchLogoSettings = async (): Promise<LogoSettings> => {
  console.log('Fetching logo settings...');

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('site_settings_operations', {
      operation: 'fetch',
      setting_key: 'logo'
    });

    if (error) {
      console.error('Error fetching logo settings:', error);
      throw new Error(`Failed to fetch logo settings: ${error.message || 'Unknown error'}`);
    }

    console.log('Logo settings fetch result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch logo settings: ${result?.error || 'Unknown error'}`);
    }

    return result.data.value as LogoSettings;
  } catch (error) {
    console.error('Failed to load logo settings:', error);
    // Return default values if there's an error
    return {
      image_url: '',
      alt_text: 'FunnyJokeTees',
      alignment: 'left'
    };
  }
};

/**
 * Fetch site title settings
 */
export const fetchSiteTitleSettings = async (): Promise<SiteTitleSettings> => {
  console.log('Fetching site title settings...');

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('site_settings_operations', {
      operation: 'fetch',
      setting_key: 'site_title'
    });

    if (error) {
      console.error('Error fetching site title settings:', error);
      throw new Error(`Failed to fetch site title settings: ${error.message || 'Unknown error'}`);
    }

    console.log('Site title settings fetch result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch site title settings: ${result?.error || 'Unknown error'}`);
    }

    return result.data.value as SiteTitleSettings;
  } catch (error) {
    console.error('Failed to load site title settings:', error);
    // Return default values if there's an error
    return {
      text: 'FunnyJokeTees',
      color: '#000000'
    };
  }
};

/**
 * Update logo settings
 */
export const updateLogoSettings = async (settings: LogoSettings): Promise<SiteSetting<LogoSettings>> => {
  console.log('Updating logo settings:', settings);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to update logo settings');
  }

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('site_settings_operations', {
      operation: 'update',
      setting_key: 'logo',
      setting_data: settings
    });

    if (error) {
      console.error('Error updating logo settings:', error);
      throw new Error(`Failed to update logo settings: ${error.message || 'Unknown error'}`);
    }

    console.log('Logo settings update result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to update logo settings: ${result?.error || 'Unknown error'}`);
    }

    return result.data as SiteSetting<LogoSettings>;
  } catch (error) {
    console.error('Error updating logo settings:', error);
    throw error;
  }
};

/**
 * Update site title settings
 */
export const updateSiteTitleSettings = async (settings: SiteTitleSettings): Promise<SiteSetting<SiteTitleSettings>> => {
  console.log('Updating site title settings:', settings);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to update site title settings');
  }

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('site_settings_operations', {
      operation: 'update',
      setting_key: 'site_title',
      setting_data: settings
    });

    if (error) {
      console.error('Error updating site title settings:', error);
      throw new Error(`Failed to update site title settings: ${error.message || 'Unknown error'}`);
    }

    console.log('Site title settings update result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to update site title settings: ${result?.error || 'Unknown error'}`);
    }

    return result.data as SiteSetting<SiteTitleSettings>;
  } catch (error) {
    console.error('Error updating site title settings:', error);
    throw error;
  }
};

/**
 * Upload logo image to storage
 */
export const uploadLogoImage = async (file: File): Promise<string> => {
  console.log('Uploading logo image:', file.name);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to upload logo images');
  }

  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading logo image:', error);
      throw new Error(`Failed to upload logo image: ${error.message || 'Unknown error'}`);
    }

    console.log('Logo image uploaded successfully:', data);

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    console.log('Logo image public URL:', publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading logo image:', error);
    throw error;
  }
};

/**
 * Fetch theme color settings
 */
export const fetchThemeColorSettings = async (): Promise<ThemeColorSettings> => {
  console.log('Fetching theme color settings...');

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('site_settings_operations', {
      operation: 'fetch',
      setting_key: 'theme_colors'
    });

    if (error) {
      console.error('Error fetching theme color settings:', error);
      throw new Error(`Failed to fetch theme color settings: ${error.message || 'Unknown error'}`);
    }

    console.log('Theme color settings fetch result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch theme color settings: ${result?.error || 'Unknown error'}`);
    }

    return result.data.value as ThemeColorSettings;
  } catch (error) {
    console.error('Failed to load theme color settings:', error);
    // Return default values if there's an error
    return {
      navbarBackground: '#FFFFFF', // White
      navbarText: '#000000', // Black
      bodyBackground: '#FFFFFF', // White
      footerBackground: '#f8e8e4', // Current footer color
      footerText: '#4B5563', // Gray-700
      footerButtonBackground: '#9333EA', // Purple-600
      footerButtonText: '#FFFFFF' // White
    };
  }
};

/**
 * Update theme color settings
 */
export const updateThemeColorSettings = async (settings: ThemeColorSettings): Promise<SiteSetting<ThemeColorSettings>> => {
  console.log('Updating theme color settings:', settings);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to update theme color settings');
  }

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('site_settings_operations', {
      operation: 'update',
      setting_key: 'theme_colors',
      setting_data: settings
    });

    if (error) {
      console.error('Error updating theme color settings:', error);
      throw new Error(`Failed to update theme color settings: ${error.message || 'Unknown error'}`);
    }

    console.log('Theme color settings update result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to update theme color settings: ${result?.error || 'Unknown error'}`);
    }

    return result.data as SiteSetting<ThemeColorSettings>;
  } catch (error) {
    console.error('Error updating theme color settings:', error);
    throw error;
  }
};

/**
 * Fetch footer settings
 */
export const fetchFooterSettings = async (): Promise<FooterSettings> => {
  console.log('Fetching footer settings...');

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('site_settings_operations', {
      operation: 'fetch',
      setting_key: 'footer_settings'
    });

    if (error) {
      console.error('Error fetching footer settings:', error);
      throw new Error(`Failed to fetch footer settings: ${error.message || 'Unknown error'}`);
    }

    console.log('Footer settings fetch result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch footer settings: ${result?.error || 'Unknown error'}`);
    }

    return result.data.value as FooterSettings;
  } catch (error) {
    console.error('Failed to load footer settings:', error);
    // Return default values if there's an error
    return {
      copyright_text: '© {year} FunnyJokeTees.',
      brand_text: 'An OpenStore Brand.',
      payment_providers: [
        {
          id: 'amex',
          name: 'American Express',
          image_url: 'https://cdn.shopify.com/s/files/1/0558/4169/files/payment-icon-american-express_small.png?v=1616599474',
          enabled: true,
          link_url: 'https://www.americanexpress.com/'
        },
        {
          id: 'apple-pay',
          name: 'Apple Pay',
          image_url: 'https://cdn.shopify.com/s/files/1/0558/4169/files/payment-icon-apple-pay_small.png?v=1616599474',
          enabled: true,
          link_url: 'https://www.apple.com/apple-pay/'
        },
        {
          id: 'diners-club',
          name: 'Diners Club',
          image_url: 'https://cdn.shopify.com/s/files/1/0558/4169/files/payment-icon-diners-club_small.png?v=1616599474',
          enabled: true,
          link_url: 'https://www.dinersclub.com/'
        },
        {
          id: 'discover',
          name: 'Discover',
          image_url: 'https://cdn.shopify.com/s/files/1/0558/4169/files/payment-icon-discover_small.png?v=1616599474',
          enabled: true,
          link_url: 'https://www.discover.com/'
        },
        {
          id: 'google-pay',
          name: 'Google Pay',
          image_url: 'https://cdn.shopify.com/s/files/1/0558/4169/files/payment-icon-google-pay_small.png?v=1616599474',
          enabled: true,
          link_url: 'https://pay.google.com/'
        },
        {
          id: 'mastercard',
          name: 'Mastercard',
          image_url: 'https://cdn.shopify.com/s/files/1/0558/4169/files/payment-icon-mastercard_small.png?v=1616599474',
          enabled: true,
          link_url: 'https://www.mastercard.com/'
        },
        {
          id: 'paypal',
          name: 'PayPal',
          image_url: 'https://cdn.shopify.com/s/files/1/0558/4169/files/payment-icon-paypal_small.png?v=1616599474',
          enabled: true,
          link_url: 'https://www.paypal.com/'
        },
        {
          id: 'shop-pay',
          name: 'Shop Pay',
          image_url: 'https://cdn.shopify.com/s/files/1/0558/4169/files/payment-icon-shopify-pay_small.png?v=1616599474',
          enabled: true,
          link_url: 'https://shop.app/'
        },
        {
          id: 'visa',
          name: 'Visa',
          image_url: 'https://cdn.shopify.com/s/files/1/0558/4169/files/payment-icon-visa_small.png?v=1616599474',
          enabled: true,
          link_url: 'https://www.visa.com/'
        }
      ]
    };
  }
};

/**
 * Update footer settings
 */
export const updateFooterSettings = async (settings: FooterSettings): Promise<SiteSetting<FooterSettings>> => {
  console.log('Updating footer settings:', settings);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to update footer settings');
  }

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('site_settings_operations', {
      operation: 'update',
      setting_key: 'footer_settings',
      setting_data: settings
    });

    if (error) {
      console.error('Error updating footer settings:', error);
      throw new Error(`Failed to update footer settings: ${error.message || 'Unknown error'}`);
    }

    console.log('Footer settings update result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to update footer settings: ${result?.error || 'Unknown error'}`);
    }

    return result.data as SiteSetting<FooterSettings>;
  } catch (error) {
    console.error('Error updating footer settings:', error);
    throw error;
  }
};
