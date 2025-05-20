/**
 * Get all reviews for admin dashboard
 */
export const getAllReviews = async (): Promise<Review[]> => {
  const { data, error } = await supabase
    .from('product_reviews')
    .select(`
      *,
      user:user_id (
        email,
        first_name,
        last_name
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * Delete a review (soft delete)
 */
export const deleteReview = async (reviewId: string): Promise<void> => {
  const { error } = await supabase
    .from('product_reviews')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', reviewId);

  if (error) {
    throw error;
  }
};

/**
 * Mark a review as viewed by admin
 */
export const markReviewAsViewed = async (reviewId: string): Promise<void> => {
  const { error } = await supabase
    .from('product_reviews')
    .update({ viewed: true })
    .eq('id', reviewId);

  if (error) {
    throw error;
  }
};

/**
 * Check if a user has already reviewed a product from a specific order
 */
export const hasUserReviewedProduct = async (
  productId: string,
  orderId: string
): Promise<boolean> => {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // First check if the order exists
  const { data: orderData, error: orderError } = await supabase
    .from('stripe_orders')
    .select('shipping_status')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single();

  if (orderError) {
    console.error('Error checking order status:', orderError);
    // Continue anyway - we'll check for reviews regardless
  } else if (orderData) {
    console.log(`Order ${orderId} status: ${orderData.shipping_status}`);

    // For debugging purposes, we'll allow reviews regardless of status
    // In production, you would want to uncomment this check
    /*
    // Check if the order is delivered (case-insensitive)
    const status = orderData.shipping_status?.toLowerCase();
    if (status !== 'delivered') {
      console.log(`Order ${orderId} is not delivered (status: ${orderData.shipping_status})`);
      return false; // Can't review if not delivered
    }
    */
  }

  // Check if the user has already reviewed this product from this order
  const { data, error } = await supabase
    .from('product_reviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('order_id', orderId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Error checking if user reviewed product:', error);
    return false;
  }

  return !!data;
};

/**
 * Get the average rating for a product
 */
export const getProductAverageRating = async (productId: string): Promise<number | null> => {
  console.log('Getting average rating for product ID:', productId);

  try {
    // Skip the RPC function and go straight to manual calculation
    console.log('Using manual calculation for average rating');

    // Calculate manually by fetching all reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_published', true)
      .is('deleted_at', null);

    if (reviewsError) {
      console.error('Error getting reviews for manual average calculation:', reviewsError);
      return null;
    }

    if (!reviews || reviews.length === 0) {
      console.log('No reviews found for product', productId);
      return null;
    }

    // Calculate average manually
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / reviews.length;
    console.log(`Manually calculated average rating: ${average} from ${reviews.length} reviews`);
    return average;
  } catch (err) {
    console.error('Exception in getProductAverageRating:', err);
    return null;
  }
};

/**
 * Get the count of reviews for a product
 */
export const getProductReviewCount = async (productId: string): Promise<number> => {
  console.log('Getting review count for product ID:', productId);

  try {
    const { count, error } = await supabase
      .from('product_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('is_published', true)
      .is('deleted_at', null);

    if (error) {
      console.error('Error getting product review count:', error);
      return 0;
    }

    console.log(`Found ${count || 0} reviews for product ${productId}`);
    return count || 0;
  } catch (err) {
    console.error('Exception in getProductReviewCount:', err);
    return 0;
  }
};
