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

export interface HomepageSection {
  id: string;
  title: string;
  link_text: string;
  link_url: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EditingSection extends Omit<HomepageSection, 'id'> {
  id?: string;
}

export interface SectionProduct {
  id: string;
  title: string;
  price: number;
  description?: string;
  image_url?: string;
  display_order: number;
  section_product_id?: string;
}

export interface HomepageSectionWithProducts extends HomepageSection {
  products: SectionProduct[];
}

/**
 * Fetch all homepage sections
 */
export const fetchAllSections = async (): Promise<HomepageSection[]> => {
  console.log('Fetching all homepage sections...');

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    // Use direct SQL to fetch all sections
    const { data: result, error } = await supabase.rpc('homepage_section_operations', {
      operation: 'fetch'
    });

    if (error) {
      console.error('Error fetching homepage sections:', error);
      throw new Error(`Failed to fetch sections: ${error.message || 'Unknown error'}`);
    }

    console.log('Sections fetch result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch sections: ${result?.error || 'Unknown error'}`);
    }

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
    console.error('Failed to load homepage sections:', error);
    throw error;
  }
};

/**
 * Fetch active homepage sections
 */
export const fetchActiveSections = async (): Promise<HomepageSection[]> => {
  console.log('Fetching active homepage sections...');

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    // Use direct SQL to fetch active sections
    const { data: result, error } = await supabase.rpc('homepage_section_operations', {
      operation: 'fetch_active'
    });

    if (error) {
      console.error('Error fetching active homepage sections:', error);
      throw new Error(`Failed to fetch active sections: ${error.message || 'Unknown error'}`);
    }

    console.log('Active sections fetch result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch active sections: ${result?.error || 'Unknown error'}`);
    }

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
    console.error('Failed to load active homepage sections:', error);
    throw error;
  }
};

/**
 * Save homepage section (create or update)
 */
export const saveSection = async (section: EditingSection): Promise<HomepageSection> => {
  console.log('Saving homepage section:', section);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to save homepage sections');
  }

  // Check if user is an admin
  const admin = await isAdmin();
  console.log('User is admin:', admin);

  // Prepare section data as JSON
  const sectionData = {
    title: section.title,
    link_text: section.link_text,
    link_url: section.link_url,
    display_order: section.display_order,
    is_active: section.is_active
  };

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    if (section.id) {
      // Update existing section
      console.log(`Updating section with ID: ${section.id}`);

      const { data: result, error } = await supabase.rpc('homepage_section_operations', {
        operation: 'update',
        section_id: section.id,
        section_data: sectionData
      });

      if (error) {
        console.error('Error updating section:', error);
        throw new Error(`Failed to update section: ${error.message || 'Unknown error'}`);
      }

      console.log('Section update successful, returned data:', result);

      if (!result || !result.success) {
        throw new Error(`Failed to update section: ${result?.error || 'Unknown error'}`);
      }

      return result.data as HomepageSection;
    } else {
      // Create new section
      console.log('Creating new section');

      const { data: result, error } = await supabase.rpc('homepage_section_operations', {
        operation: 'insert',
        section_data: sectionData
      });

      if (error) {
        console.error('Error creating section:', error);
        throw new Error(`Failed to create section: ${error.message || 'Unknown error'}`);
      }

      console.log('Section creation successful, returned data:', result);

      if (!result || !result.success) {
        throw new Error(`Failed to create section: ${result?.error || 'No data returned'}`);
      }

      return result.data as HomepageSection;
    }
  } catch (error) {
    console.error('Error saving homepage section:', error);
    throw error;
  }
};

/**
 * Delete homepage section
 */
export const deleteSection = async (id: string): Promise<void> => {
  console.log(`Deleting section with ID: ${id}`);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to delete homepage sections');
  }

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('homepage_section_operations', {
      operation: 'delete',
      section_id: id
    });

    if (error) {
      console.error('Error deleting section:', error);
      throw new Error(`Failed to delete section: ${error.message || 'Unknown error'}`);
    }

    console.log('Section deletion successful, returned data:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to delete section: ${result?.error || 'Unknown error'}`);
    }

    console.log('Section deleted successfully');
  } catch (error) {
    console.error('Error deleting homepage section:', error);
    throw error;
  }
};

/**
 * Fetch products for a section
 */
export const fetchSectionProducts = async (sectionId: string): Promise<SectionProduct[]> => {
  console.log(`Fetching products for section: ${sectionId}`);

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('section_product_operations', {
      operation: 'fetch_products',
      p_section_id: sectionId
    });

    if (error) {
      console.error('Error fetching section products:', error);
      throw new Error(`Failed to fetch section products: ${error.message || 'Unknown error'}`);
    }

    console.log('Section products fetch result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch section products: ${result?.error || 'Unknown error'}`);
    }

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
    console.error('Failed to load section products:', error);
    throw error;
  }
};

/**
 * Add product to section
 */
export const addProductToSection = async (sectionId: string, productId: string, displayOrder?: number): Promise<SectionProduct> => {
  console.log(`Adding product ${productId} to section ${sectionId}`);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to add products to sections');
  }

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const productData = displayOrder !== undefined ? { display_order: displayOrder } : {};

    const { data: result, error } = await supabase.rpc('section_product_operations', {
      operation: 'add_product',
      p_section_id: sectionId,
      p_product_id: productId,
      product_data: productData
    });

    if (error) {
      console.error('Error adding product to section:', error);
      throw new Error(`Failed to add product to section: ${error.message || 'Unknown error'}`);
    }

    console.log('Product added to section, returned data:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to add product to section: ${result?.error || 'Unknown error'}`);
    }

    return result.data as SectionProduct;
  } catch (error) {
    console.error('Error adding product to section:', error);
    throw error;
  }
};

/**
 * Remove product from section
 */
export const removeProductFromSection = async (sectionId: string, productId: string): Promise<void> => {
  console.log(`Removing product ${productId} from section ${sectionId}`);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to remove products from sections');
  }

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('section_product_operations', {
      operation: 'remove_product',
      p_section_id: sectionId,
      p_product_id: productId
    });

    if (error) {
      console.error('Error removing product from section:', error);
      throw new Error(`Failed to remove product from section: ${error.message || 'Unknown error'}`);
    }

    console.log('Product removed from section, returned data:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to remove product from section: ${result?.error || 'Unknown error'}`);
    }

    console.log('Product removed from section successfully');
  } catch (error) {
    console.error('Error removing product from section:', error);
    throw error;
  }
};

/**
 * Update product order in section
 */
export const updateProductOrder = async (sectionId: string, productId: string, displayOrder: number): Promise<SectionProduct> => {
  console.log(`Updating order of product ${productId} in section ${sectionId} to ${displayOrder}`);

  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.error('User is not authenticated');
    throw new Error('You must be logged in to update product order');
  }

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('section_product_operations', {
      operation: 'update_order',
      p_section_id: sectionId,
      p_product_id: productId,
      product_data: { display_order: displayOrder }
    });

    if (error) {
      console.error('Error updating product order:', error);
      throw new Error(`Failed to update product order: ${error.message || 'Unknown error'}`);
    }

    console.log('Product order updated, returned data:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to update product order: ${result?.error || 'Unknown error'}`);
    }

    return result.data as SectionProduct;
  } catch (error) {
    console.error('Error updating product order:', error);
    throw error;
  }
};

/**
 * Get all homepage data
 */
export const getHomepageData = async (): Promise<HomepageSectionWithProducts[]> => {
  console.log('Fetching homepage data...');

  try {
    // Refresh the session before making the request
    await clearSupabaseCache();

    const { data: result, error } = await supabase.rpc('get_homepage_data');

    if (error) {
      console.error('Error fetching homepage data:', error);
      throw new Error(`Failed to fetch homepage data: ${error.message || 'Unknown error'}`);
    }

    console.log('Homepage data fetch result:', result);

    if (!result || !result.success) {
      throw new Error(`Failed to fetch homepage data: ${result?.error || 'Unknown error'}`);
    }

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
    console.error('Failed to load homepage data:', error);
    throw error;
  }
};
