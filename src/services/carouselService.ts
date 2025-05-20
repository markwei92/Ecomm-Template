import { supabase } from '../lib/supabase';

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

export interface CarouselSlide {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  button_text: string;
  button_link: string;
  button_color: string;
  text_color: string;
  title_color: string;
  description_color: string;
  show_tint: boolean;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EditingSlide extends Omit<CarouselSlide, 'id'> {
  id?: string;
  imageFile?: File | null;
}

/**
 * Fetch all carousel slides with cache busting
 */
export const fetchAllCarouselSlides = async (): Promise<CarouselSlide[]> => {
  console.log('Fetching all carousel slides with direct SQL...');

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    // Use direct SQL to fetch all slides
    const { data: result, error } = await supabase.rpc('direct_sql_carousel_operation', {
      operation: 'fetch'
    });

    if (error) {
      console.error('Error fetching carousel slides with direct SQL:', error);
      throw new Error(`Failed to fetch slides: ${error.message || 'Unknown error'}`);
    }

    console.log('Direct SQL fetch result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch slides: ${result?.error || 'Unknown error'}`);
    }

    // Log the data to help debug
    console.log('Carousel slides fetched successfully. Data type:', typeof result.data);
    console.log('Is array?', Array.isArray(result.data));
    console.log('Data:', result.data);

    // Ensure we return an array
    if (!result.data) return [];

    // If it's already an array, return it
    if (Array.isArray(result.data)) {
      return result.data;
    }

    // If it's not an array but has data, try to convert it
    try {
      if (typeof result.data === 'string') {
        return JSON.parse(result.data);
      }
      // If it's an object with numeric keys, convert to array
      if (typeof result.data === 'object') {
        return Object.values(result.data);
      }
    } catch (e) {
      console.error('Error parsing result data:', e);
    }

    // Fallback to empty array
    return [];
  } catch (error) {
    console.error('Failed to load carousel slides:', error);
    throw error;
  }
};

/**
 * Fetch active carousel slides with cache busting
 */
export const fetchActiveCarouselSlides = async (): Promise<CarouselSlide[]> => {
  console.log('Fetching active carousel slides with direct SQL...');

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    // Use direct SQL to fetch active slides
    const { data: result, error } = await supabase.rpc('direct_sql_carousel_operation', {
      operation: 'fetch_active'
    });

    if (error) {
      console.error('Error fetching active carousel slides with direct SQL:', error);
      throw new Error(`Failed to fetch active slides: ${error.message || 'Unknown error'}`);
    }

    console.log('Direct SQL fetch active result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch active slides: ${result?.error || 'Unknown error'}`);
    }

    // Log the data to help debug
    console.log('Active carousel slides fetched successfully. Data type:', typeof result.data);
    console.log('Is array?', Array.isArray(result.data));
    console.log('Data:', result.data);

    // Ensure we return an array
    if (!result.data) return [];

    // If it's already an array, return it
    if (Array.isArray(result.data)) {
      return result.data;
    }

    // If it's not an array but has data, try to convert it
    try {
      if (typeof result.data === 'string') {
        return JSON.parse(result.data);
      }
      // If it's an object with numeric keys, convert to array
      if (typeof result.data === 'object') {
        return Object.values(result.data);
      }
    } catch (e) {
      console.error('Error parsing result data:', e);
    }

    // Fallback to empty array
    return [];
  } catch (error) {
    console.error('Failed to load active carousel slides:', error);
    throw error;
  }
};

/**
 * Upload image to Supabase storage
 */
export const uploadCarouselImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `carousel/${fileName}`;

  // Use the existing "product-images" bucket instead of "images"
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading carousel image:', uploadError);
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl;
};

/**
 * Save carousel slide (create or update)
 */
export const saveCarouselSlide = async (slide: EditingSlide): Promise<CarouselSlide> => {
  console.log('Saving carousel slide with direct SQL:', slide);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to save carousel slides');
  }

  // Check if user is an admin
  const admin = await isAdmin();
  console.log('User is admin:', admin);

  // Prepare slide data as JSON
  const slideData = {
    title: slide.title,
    description: slide.description,
    image_url: slide.image_url,
    button_text: slide.button_text,
    button_link: slide.button_link,
    button_color: slide.button_color,
    text_color: slide.text_color,
    title_color: slide.title_color || '#FFFFFF',
    description_color: slide.description_color || '#FFFFFF',
    show_tint: typeof slide.show_tint === 'boolean' ? slide.show_tint : true,
    display_order: slide.display_order,
    is_active: slide.is_active
  };

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    if (slide.id) {
      // Update existing slide using direct SQL
      console.log(`Updating slide with ID: ${slide.id} using direct SQL`);

      const { data: result, error } = await supabase.rpc('direct_sql_carousel_operation', {
        operation: 'update',
        slide_id: slide.id,
        slide_data: slideData
      });

      if (error) {
        console.error('Error updating slide with direct SQL:', error);
        throw new Error(`Failed to update slide: ${error.message || 'Unknown error'}`);
      }

      console.log('Direct SQL update successful, returned data:', result);

      if (!result || !result.success) {
        throw new Error(`Failed to update slide: ${result?.error || 'Unknown error'}`);
      }

      // Force update homepage to refresh cache
      await supabase.rpc('force_update_homepage');

      // Log the data to help debug
      console.log('Slide updated successfully. Data type:', typeof result.data);
      console.log('Data:', result.data);

      return result.data as CarouselSlide;
    } else {
      // Create new slide using direct SQL
      console.log('Creating new slide using direct SQL');

      // Use the direct SQL operation function to create the slide
      const { data: result, error } = await supabase.rpc('direct_sql_carousel_operation', {
        operation: 'insert',
        slide_data: slideData
      });

      if (error) {
        console.error('Error creating slide with direct SQL:', error);
        throw new Error(`Failed to create slide: ${error.message || 'Unknown error'}`);
      }

      console.log('Direct SQL insert result:', result);

      if (!result || !result.success) {
        throw new Error(`Failed to create slide: ${result?.error || 'No data returned'}`);
      }

      // Force update homepage to refresh cache
      await supabase.rpc('force_update_homepage');

      // Log the data to help debug
      console.log('Slide created successfully. Data type:', typeof result.data);
      console.log('Data:', result.data);

      return result.data as CarouselSlide;
    }
  } catch (error) {
    console.error('Error saving carousel slide:', error);
    throw error;
  }
};

/**
 * Delete carousel slide
 */
export const deleteCarouselSlide = async (id: string): Promise<void> => {
  console.log(`Deleting slide with ID: ${id} using direct SQL`);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to delete carousel slides');
  }

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    // Use direct SQL to delete the slide
    const { data: result, error } = await supabase.rpc('direct_sql_carousel_operation', {
      operation: 'delete',
      slide_id: id
    });

    if (error) {
      console.error('Error deleting slide with direct SQL:', error);
      throw new Error(`Failed to delete slide: ${error.message || 'Unknown error'}`);
    }

    console.log('Direct SQL delete result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to delete slide: ${result?.error || 'Unknown error'}`);
    }

    // Log the data to help debug
    console.log('Slide deleted successfully. Data type:', typeof result.data);
    console.log('Data:', result.data);

    // Force update homepage to refresh cache
    await supabase.rpc('force_update_homepage');

    console.log('Slide deleted successfully');
  } catch (error) {
    console.error('Error deleting carousel slide:', error);
    throw error;
  }
};

/**
 * Clear Supabase cache by refreshing the auth session
 * This can help ensure fresh data is fetched
 */
export const clearSupabaseCache = async (): Promise<void> => {
  try {
    console.log('Clearing Supabase cache...');

    // Refresh the session to clear cache
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      console.warn('Error refreshing session:', error);
      // Continue even if there's an error
    }

    console.log('Supabase cache cleared');
  } catch (error) {
    console.warn('Error clearing Supabase cache:', error);
    // Continue even if there's an error
  }
};
