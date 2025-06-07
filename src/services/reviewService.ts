import { supabase } from '../lib/supabase';

export interface Review {
    id: string;
    user_id?: string;
    product_id: string;
    order_id?: string;
    rating: number;
    review_text: string;
    is_published: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    viewed: boolean;
    // Custom fields (not in database)
    _adminReviewerName?: string; // Custom field to track admin reviewer name
    _isAdminReview?: boolean;    // Custom field to track if this is an admin review
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
    try {
        // First, get all reviews with a simplified query
        const { data, error } = await supabase
            .from('product_reviews')
            .select('*')
            .eq('product_id', productId)
            .eq('is_published', true)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            return [];
        }

        // If we have reviews, fetch the user profiles separately
        if (data.length > 0) {
            try {
                // Get unique user IDs
                const userIds = [...new Set(data.map(review => review.user_id))];

                // Fetch profiles for these users
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email')
                    .in('id', userIds);

                if (!profilesError && profiles) {

                    // Create a map of user_id to profile
                    const profileMap = profiles.reduce<Record<string, any>>((map, profile) => {
                        map[profile.id] = profile;
                        return map;
                    }, {});

                    // Attach profiles to reviews
                    data.forEach(review => {
                        const profile = profileMap[review.user_id];
                        if (profile) {
                            review.profiles = profile;
                            review.user = {
                                first_name: profile.first_name || '',
                                last_name: profile.last_name || '',
                                email: profile.email || ''
                            };
                        } else {
                            // If no profile data, create an empty user object
                            review.user = {
                                first_name: '',
                                last_name: '',
                                email: ''
                            };
                        }
                    });

                }
            } catch (profileErr) {
                // Silently handle profile errors
            }
        }

        // Process the reviews to ensure they have all required fields
        const processedReviews = data.map(review => {
            try {
                // Ensure user object exists
                if (!review.user) {
                    review.user = {
                        first_name: '',
                        last_name: '',
                        email: ''
                    };
                }

                // Ensure review_text exists
                if (!review.review_text) {
                    review.review_text = '';
                }

                // Add debug information
                review._debug = {
                    has_user: !!review.user,
                    has_profile: !!review.profiles,
                    user_fields: review.user ? Object.keys(review.user) : [],
                    profile_fields: review.profiles ? Object.keys(review.profiles) : [],
                    review_text: review.review_text,
                    review_text_length: review.review_text ? review.review_text.length : 0
                };

                return review;
            } catch (err) {
                return review;
            }
        });

        return processedReviews;
    } catch (err) {
        return [];
    }
};

/**
 * Get all reviews for admin dashboard
 */
export const getAllReviews = async (): Promise<Review[]> => {
    console.log('Fetching all reviews for admin dashboard');

    try {
        // First, get all reviews with a simplified query
        const { data, error } = await supabase
            .from('product_reviews')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all reviews:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.log('No reviews found');
            return [];
        }

        console.log(`Found ${data.length} reviews`);

        // Log the first review to check its structure
        if (data.length > 0) {
            console.log('Sample review:', data[0]);
            console.log('Review text exists:', 'review_text' in data[0]);
            console.log('Review text value:', data[0].review_text);
            console.log('Review text type:', typeof data[0].review_text);
        }

        // If we have reviews, fetch the user profiles separately
        if (data.length > 0) {
            try {
                // Get unique user IDs
                const userIds = [...new Set(data.map(review => review.user_id))];

                // Fetch profiles for these users
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email')
                    .in('id', userIds);

                if (profilesError) {
                    console.error('Error fetching user profiles:', profilesError);
                } else if (profiles) {
                    console.log(`Found ${profiles.length} user profiles`);

                    // Create a map of user_id to profile
                    const profileMap = profiles.reduce<Record<string, any>>((map, profile) => {
                        map[profile.id] = profile;
                        return map;
                    }, {});

                    // Attach profiles to reviews
                    data.forEach(review => {
                        const profile = profileMap[review.user_id];
                        if (profile) {
                            review.profiles = profile;
                            review.user = {
                                first_name: profile.first_name || '',
                                last_name: profile.last_name || '',
                                email: profile.email || ''
                            };
                        } else {
                            // If no profile data, create an empty user object
                            review.user = {
                                first_name: '',
                                last_name: '',
                                email: ''
                            };
                        }
                    });
                }
            } catch (profileErr) {
                console.error('Error enhancing reviews with profiles:', profileErr);
            }
        }

        // Process the reviews to ensure they have all required fields
        const processedReviews = data.map(review => {
            try {
                // Ensure user object exists
                if (!review.user) {
                    review.user = {
                        first_name: '',
                        last_name: '',
                        email: ''
                    };
                }

                // Ensure review_text exists
                if (!review.review_text) {
                    review.review_text = '';
                }

                // Add debug information
                review._debug = {
                    has_user: !!review.user,
                    has_profile: !!review.profiles,
                    user_fields: review.user ? Object.keys(review.user) : [],
                    profile_fields: review.profiles ? Object.keys(review.profiles) : [],
                    review_text: review.review_text,
                    review_text_length: review.review_text ? review.review_text.length : 0
                };

                console.log(`Processed review ${review.id}, has review_text: ${!!review.review_text}`);

                return review;
            } catch (err) {
                console.error('Error processing review:', err);
                return review;
            }
        });

        console.log('Processed reviews:', processedReviews);
        return processedReviews;
    } catch (err) {
        console.error('Exception in getAllReviews:', err);
        return [];
    }
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
 * Create a review as admin
 */
export const createAdminReview = async (
    productId: string,
    name: string,
    rating: number,
    reviewText: string
): Promise<Review> => {
    console.log('Creating admin review for product:', productId);

    // First, get the current user's ID if available
    const { data: { user } } = await supabase.auth.getUser();
    let userId = user?.id;

    // If no user is logged in, try to get a valid user ID from the database
    if (!userId) {
        console.log('No user logged in, trying to find a valid user ID from existing reviews');

        // Try to get a valid user ID from an existing review
        const { data: existingReview } = await supabase
            .from('product_reviews')
            .select('user_id')
            .limit(1)
            .single();

        if (existingReview?.user_id) {
            userId = existingReview.user_id;
            console.log('Found valid user ID from existing review:', userId);
        } else {
            console.log('Could not find a valid user ID from existing reviews, trying profiles table');

            // Try to get a valid user ID from the profiles table
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id')
                .limit(1)
                .single();

            if (profileData?.id) {
                userId = profileData.id;
                console.log('Found valid user ID from profiles table:', userId);
            } else {
                console.log('Could not find a valid user ID from profiles table');
            }
        }
    }

    // If we still don't have a valid user ID, we can't proceed
    if (!userId) {
        throw new Error('Cannot create review: No valid user ID available. Please log in or create a user account first.');
    }

    // Try to get a valid order_id from an existing review
    let orderId = null; // Default to null, we'll try to find a valid one

    try {
        // First try to get from existing reviews
        const { data: existingReviewWithOrder } = await supabase
            .from('product_reviews')
            .select('order_id')
            .not('order_id', 'is', null)
            .limit(1)
            .single();

        if (existingReviewWithOrder?.order_id) {
            orderId = existingReviewWithOrder.order_id;
            console.log('Found valid order ID from existing review:', orderId);
        } else {
            // If that fails, try to get from stripe_orders table
            console.log('Trying to find order ID from stripe_orders table');
            const { data: orderData } = await supabase
                .from('stripe_orders')
                .select('id')
                .limit(1)
                .single();

            if (orderData?.id) {
                orderId = orderData.id;
                console.log('Found valid order ID from stripe_orders table:', orderId);
            } else {
                console.log('Could not find a valid order ID from stripe_orders table');
            }
        }
    } catch (err) {
        console.log('Could not find a valid order ID, will try to create review without it');
    }

    // Prepare the review data with the admin reviewer name in the review text
    const formattedReviewText = `[ADMIN_REVIEW][${name}] ${reviewText}`;

    const reviewData: any = {
        product_id: productId,
        rating,
        review_text: formattedReviewText,
        is_published: true,
        viewed: true,
        // Use the valid user ID we found
        user_id: userId
    };

    // Only include order_id if it's not null
    if (orderId) {
        reviewData.order_id = orderId;
    }

    console.log('Submitting review with data:', reviewData);

    // Submit the review to Supabase
    const { data, error } = await supabase
        .from('product_reviews')
        .insert(reviewData)
        .select()
        .single();

    if (error) {
        console.error('Error creating admin review:', error);
        throw error;
    }

    // Add user information for display
    data.user = {
        first_name: name,
        last_name: '',
        email: 'admin@example.com'
    };

    // Store the admin reviewer name in a custom field that won't be sent to the database
    data._adminReviewerName = name;
    data._isAdminReview = true;

    // We don't need to modify the review text anymore since we're using the custom name field

    console.log('Created admin review:', data);
    return data;
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