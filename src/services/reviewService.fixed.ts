import { supabase } from '../lib/supabase';

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  rating: number;
  review_text: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  viewed: boolean;
  // Joined fields
  user?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

/**
 * Submit a new product review
 */
export const submitReview = async (
  productId: string,
  orderId: string,
  rating: number,
  reviewText: string
): Promise<Review> => {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to submit a review');
  }

  console.log('Submitting review as user:', user);

  // Submit the review to Supabase
  const { data, error } = await supabase
    .from('product_reviews')
    .insert({
      user_id: user.id,
      product_id: productId,
      order_id: orderId,
      rating,
      review_text: reviewText,
      is_published: true,
      viewed: false
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Get user metadata to include in the response
  try {
    // First try to get profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (!profileError && profileData) {
      data.user = {
        email: user.email,
        first_name: profileData.first_name,
        last_name: profileData.last_name
      };
    } else {
      // Fall back to user metadata
      data.user = {
        email: user.email,
        first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
        last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
        full_name: user.user_metadata?.full_name || ''
      };
    }

    console.log('Enhanced review with user data:', data);
  } catch (err) {
    console.error('Error enhancing submitted review with user data:', err);
  }

  return data;
};

/**
 * Get reviews for a specific product
 */
export const getProductReviews = async (productId: string): Promise<Review[]> => {
  console.log('Fetching reviews for product ID:', productId);

  try {
    // Get all reviews for the product with user information from profiles
    // Using a simpler query that doesn't rely on complex joins or RPC functions
    const { data, error } = await supabase
      .from('product_reviews')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq('product_id', productId)
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`No reviews found for product ${productId}`);
      return [];
    }

    console.log(`Found ${data.length} reviews for product ${productId}`);

    // Process the reviews to ensure they have user information
    const processedReviews = data.map(review => {
      // Create a user object from the profiles data
      if (review.profiles) {
        review.user = {
          first_name: review.profiles.first_name || '',
          last_name: review.profiles.last_name || '',
          email: review.profiles.email || ''
        };
      } else {
        // If no profile data, create an empty user object
        review.user = {
          first_name: '',
          last_name: '',
          email: ''
        };
      }

      // Add debug information
      review._debug = {
        has_user: !!review.user,
        has_profile: !!review.profiles,
        user_fields: review.user ? Object.keys(review.user) : [],
        profile_fields: review.profiles ? Object.keys(review.profiles) : []
      };

      return review;
    });

    console.log('Processed reviews:', processedReviews);
    return processedReviews;
  } catch (err) {
    console.error('Exception in getProductReviews:', err);
    return [];
  }
};
