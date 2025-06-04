import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, ArrowLeft, CreditCard, Star } from 'lucide-react';
import { Tab } from '@headlessui/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { MiniCartNotification } from '../components/MiniCartNotification';
import { ReviewModal } from '../components/ReviewModal';
import { ProductReviews } from '../components/ProductReviews';
import { getProductReviews, getProductAverageRating, getProductReviewCount, hasUserReviewedProduct, Review } from '../services/reviewService';

interface ProductDetails {
  id: string;
  title: string;
  description: string;
  price: number;
  themes: string[];
  age_group: string;
  can_personalize: boolean;
  product_images: Array<{
    url: string;
    color: string;
    is_primary: boolean;
  }>;
  product_variants: Array<{
    id: string;
    size: string;
    color: string;
    price_adjustment: number;
    stock_quantity: number;
  }>;
}

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { dispatch } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [personalizationText, setPersonalizationText] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMiniNotification, setShowMiniNotification] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [canUserReview, setCanUserReview] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  // Test toast notifications on component mount
  useEffect(() => {
    // Show a test toast notification
    console.log('Testing toast notification from ProductDetailsPage');
    setTimeout(() => {
      toast.info('Testing toast from ProductDetailsPage');
    }, 2000);
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id) return;

        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_images (
              url,
              color,
              is_primary
            ),
            product_variants (
              id,
              size,
              color,
              price_adjustment,
              stock_quantity
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setProduct(data);

        // Set initial selections
        if (data.product_variants.length > 0) {
          // Determine age group from the first variant's size
          const firstVariant = data.product_variants[0];
          let ageGroup = 'adults';
          if (['2T', '3T', '4T', '5T'].includes(firstVariant.size)) {
            ageGroup = 'toddlers';
          } else if (firstVariant.size.includes('(Kids)')) {
            ageGroup = 'kids';
          }

          setSelectedAgeGroup(ageGroup);
          setSelectedSize(firstVariant.size);
          setSelectedColor(firstVariant.color);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Fetch reviews for the product
  // Check if the user can review this product
  useEffect(() => {
    const checkUserCanReview = async () => {
      if (!id) return;

      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          console.log('User not logged in, cannot review');
          setCanUserReview(false);
          return;
        }

        // Get user's orders that contain this product
        const { data: orders, error: ordersError } = await supabase
          .from('stripe_orders')
          .select('id, shipping_status, order_items!inner(product_id)')
          .eq('user_id', user.id)
          .eq('order_items.product_id', id)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('Error fetching user orders:', ordersError);
          setCanUserReview(false);
          return;
        }

        if (!orders || orders.length === 0) {
          console.log('User has not purchased this product');
          setCanUserReview(false);
          return;
        }

        console.log('User has purchased this product in these orders:', orders);
        setUserOrders(orders);

        // Check if the user has already reviewed this product
        for (const order of orders) {
          const hasReviewed = await hasUserReviewedProduct(id, order.id);
          if (!hasReviewed) {
            console.log('User can review this product from order:', order.id);
            setCanUserReview(true);
            return;
          }
        }

        console.log('User has already reviewed this product from all eligible orders');
        setCanUserReview(false);
      } catch (err) {
        console.error('Error checking if user can review:', err);
        setCanUserReview(false);
      }
    };

    checkUserCanReview();
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;

      setReviewsLoading(true);

      try {
        console.log('Fetching reviews for product:', id);

        // First, check if the product exists
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, title')
          .eq('id', id)
          .single();

        if (productError) {
          console.error('Error checking product existence:', productError);
          // Continue anyway, we'll try to fetch reviews
        } else {
          console.log('Product found:', productData);
        }

        // Fetch reviews using the improved service
        try {
          console.log('Fetching reviews using improved service method');
          const reviewsData = await getProductReviews(id);
          console.log('Reviews data from service:', reviewsData);

          if (reviewsData && reviewsData.length > 0) {
            console.log(`Setting ${reviewsData.length} reviews from service data`);
            setReviews(reviewsData);

            // Calculate average rating manually
            const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0);
            const average = sum / reviewsData.length;
            console.log(`Calculated average rating: ${average} from ${reviewsData.length} reviews`);
            setAverageRating(average);
            setReviewCount(reviewsData.length);
          } else {
            console.log('No reviews returned from service');

            // Try a direct query as a fallback
            console.log('Trying direct query as fallback');
            const { data: directReviews, error: directError } = await supabase
              .from('product_reviews')
              .select('*')
              .eq('product_id', id)
              .eq('is_published', true)
              .is('deleted_at', null)
              .order('created_at', { ascending: false });

            if (directError) {
              console.error('Error directly querying reviews:', directError);
            } else if (directReviews && directReviews.length > 0) {
              console.log(`Found ${directReviews.length} reviews with direct query`);

              // Process the direct reviews
              const processedReviews = await processDirectReviews(directReviews, id);
              console.log('Processed direct reviews:', processedReviews);

              setReviews(processedReviews);

              // Calculate average rating manually
              const sum = directReviews.reduce((acc, review) => acc + review.rating, 0);
              const average = sum / directReviews.length;
              console.log(`Calculated average rating: ${average} from direct reviews`);
              setAverageRating(average);
              setReviewCount(directReviews.length);
            } else {
              console.log('No reviews found with direct query either');
              // Fetch review count and average rating separately
              await fetchReviewStats(id);
            }
          }
        } catch (reviewError) {
          console.error('Error fetching reviews from service:', reviewError);
          // Try to fetch review stats separately
          await fetchReviewStats(id);
        }
      } catch (err) {
        console.error('Error in main fetchReviews function:', err);
      } finally {
        setReviewsLoading(false);
      }
    };

    // Helper function to process direct reviews
    const processDirectReviews = async (directReviews: any[], productId: string) => {
      try {
        // Get unique user IDs
        const userIds = [...new Set(directReviews.map(review => review.user_id))];

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
          return directReviews.map(review => {
            try {
              const profile = profileMap[review.user_id];

              // Create a processed review object
              const processedReview = {
                ...review,
                product_id: productId,
                order_id: review.order_id || '',
                is_published: true,
                updated_at: review.updated_at || review.created_at,
                deleted_at: null,
                viewed: false,
                user: {
                  first_name: '',
                  last_name: '',
                  email: ''
                }
              };

              // Add profile data if available
              if (profile) {
                processedReview.profiles = profile;
                processedReview.user = {
                  first_name: profile.first_name || '',
                  last_name: profile.last_name || '',
                  email: profile.email || ''
                };
              }

              return processedReview;
            } catch (err) {
              console.error('Error processing review:', err);
              return review;
            }
          });
        }

        // If we couldn't fetch profiles, return the reviews as is
        return directReviews;
      } catch (err) {
        console.error('Error in processDirectReviews:', err);
        return directReviews;
      }
    };

    // Helper function to fetch review stats separately
    const fetchReviewStats = async (productId: string) => {
      try {
        // Fetch average rating
        const avgRating = await getProductAverageRating(productId);
        console.log('Average rating from service:', avgRating);

        if (avgRating !== null) {
          setAverageRating(avgRating);
        }

        // Fetch review count
        const count = await getProductReviewCount(productId);
        console.log('Review count from service:', count);

        if (count !== null) {
          setReviewCount(count);
        }
      } catch (err) {
        console.error('Error fetching review stats:', err);
      }
    };

    fetchReviews();

    // Set up real-time subscription for review updates
    const channel = supabase.channel('product-reviews-' + id);

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_reviews',
          filter: `product_id=eq.${id}`
        },
        (payload) => {
          console.log('Review update received:', payload);
          // Refresh reviews when a change is detected
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const addProductToCart = async (redirectToCheckout = false) => {
    if (!product || !currentVariant) return false;

    try {
      // Add to cart regardless of authentication status
      dispatch({
        type: 'ADD_TO_CART',
        payload: {
          productId: product.id,
          title: product.title,
          price: parseFloat(finalPrice),
          quantity,
          size: selectedSize,
          color: selectedColor,
          image: product.product_images[0].url,
          personalizationText: product.can_personalize === true ? personalizationText : undefined
        },
      });

      // Show success message if not redirecting to checkout
      if (!redirectToCheckout) {
        // Show mini notification
        setShowMiniNotification(true);

        // Also show toast notification
        toast.success('Added to cart!');
      }

      // If redirecting to checkout, proceed directly without checking authentication
      // This allows guest checkout
      if (redirectToCheckout) {
        // No authentication check needed - allow guest checkout
        console.log('Proceeding to checkout as guest or authenticated user');
      }

      return true;
    } catch (err) {
      console.error('Error adding to cart:', err);
      toast.error('Failed to add to cart');
      return false;
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    await addProductToCart(false);
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    const success = await addProductToCart(true);
    if (success) {
      navigate('/checkout');
    }
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    const imageIndex = product?.product_images.findIndex(img => img.color === color) ?? 0;
    if (imageIndex !== -1) setCurrentImageIndex(imageIndex);
  };

  const handlePrevImage = () => {
    if (!product?.product_images.length) return;
    setCurrentImageIndex(prev =>
      prev === 0 ? product.product_images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!product?.product_images.length) return;
    setCurrentImageIndex(prev =>
      prev === product.product_images.length - 1 ? 0 : prev + 1
    );
  };

  const getCurrentVariant = () => {
    return product?.product_variants.find(
      v => v.size === selectedSize && v.color === selectedColor
    );
  };

  // Helper function to determine age group from size
  const getAgeGroupFromSize = (size: string) => {
    if (['2T', '3T', '4T', '5T'].includes(size)) {
      return 'toddlers';
    } else if (size.includes('(Kids)')) {
      return 'kids';
    }
    return 'adults';
  };

  // Get available age groups from variants
  const getAvailableAgeGroups = () => {
    if (!product) return [];

    const ageGroups = new Set<string>();
    product.product_variants.forEach(variant => {
      ageGroups.add(getAgeGroupFromSize(variant.size));
    });

    return Array.from(ageGroups).sort();
  };

  // Get available sizes for the selected age group
  const getAvailableSizes = () => {
    if (!product || !selectedAgeGroup) return [];

    return Array.from(new Set(
      product.product_variants
        .filter(v => getAgeGroupFromSize(v.size) === selectedAgeGroup)
        .map(v => v.size)
    ));
  };

  // Get available colors for the selected age group
  const getAvailableColors = () => {
    if (!product || !selectedAgeGroup) return [];

    return Array.from(new Set(
      product.product_variants
        .filter(v => getAgeGroupFromSize(v.size) === selectedAgeGroup)
        .map(v => v.color)
    ));
  };

  // Handle age group change
  const handleAgeGroupChange = (ageGroup: string) => {
    setSelectedAgeGroup(ageGroup);

    // Reset size and color selections and pick the first available ones for this age group
    const availableVariants = product?.product_variants
      .filter(v => getAgeGroupFromSize(v.size) === ageGroup);

    if (availableVariants && availableVariants.length > 0) {
      setSelectedSize(availableVariants[0].size);
      setSelectedColor(availableVariants[0].color);
    }
  };

  // Format size name for display (remove "(Kids)" suffix)
  const formatSizeName = (size: string) => {
    return size.replace(' (Kids)', '');
  };

  // Format age group name for display
  const formatAgeGroupName = (ageGroup: string) => {
    return ageGroup.charAt(0).toUpperCase() + ageGroup.slice(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pt-16 flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">{error || 'Product not found'}</p>
        <button
          onClick={() => navigate('/products')}
          className="text-black hover:underline"
        >
          Return to Products
        </button>
      </div>
    );
  }

  const currentVariant = getCurrentVariant();
  const finalPrice = (product.price + (currentVariant?.price_adjustment || 0)).toFixed(2);

  return (
    <div className="min-h-screen pt-16 bg-white">
      {/* Mini Cart Notification */}
      <MiniCartNotification
        isVisible={showMiniNotification}
        productTitle={product.title}
        onClose={() => setShowMiniNotification(false)}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-black mb-8"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <img
                src={product.product_images[currentImageIndex]?.url}
                alt={`${product.title} in ${product.product_images[currentImageIndex]?.color}`}
                className="w-full h-full object-cover"
              />
            </div>

            {product.product_images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/30 backdrop-blur-sm rounded-full p-2 hover:bg-white/90 transition-all duration-200"
                >
                  <ChevronLeft className="h-6 w-6 text-black" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/30 backdrop-blur-sm rounded-full p-2 hover:bg-white/90 transition-all duration-200"
                >
                  <ChevronRight className="h-6 w-6 text-black" />
                </button>
              </>
            )}

            {/* Thumbnail Navigation */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {product.product_images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`aspect-square rounded-md overflow-hidden ${currentImageIndex === index ? 'ring-2 ring-black' : ''
                    }`}
                >
                  <img
                    src={image.url}
                    alt={`${product.title} in ${image.color}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
              <p className="text-2xl font-semibold text-gray-900">${finalPrice}</p>
            </div>

            <div className="space-y-6">
              {/* Description */}
              <div>
                <h2 className="text-sm font-medium text-gray-900">Description</h2>
                <p className="mt-2 text-gray-600">{product.description}</p>
              </div>

              {/* Age Group Selection */}
              {getAvailableAgeGroups().length > 1 && (
                <div>
                  <h2 className="text-sm font-medium text-gray-900">Age Group</h2>
                  <div className="mt-2">
                    <select
                      value={selectedAgeGroup}
                      onChange={(e) => handleAgeGroupChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    >
                      {getAvailableAgeGroups().map((ageGroup) => (
                        <option key={ageGroup} value={ageGroup}>
                          {formatAgeGroupName(ageGroup)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Size Selection */}
              <div>
                <h2 className="text-sm font-medium text-gray-900">Size</h2>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {getAvailableSizes().map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`
                        py-2 px-4 text-sm font-medium rounded-md
                        ${selectedSize === size
                          ? 'bg-black text-white'
                          : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      {formatSizeName(size)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <h2 className="text-sm font-medium text-gray-900">Color</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {getAvailableColors().map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`
                        w-10 h-10 rounded-full border-2
                        ${selectedColor === color ? 'border-black' : 'border-gray-300'}
                      `}
                      style={{ backgroundColor: color }}
                    >
                      <span className="sr-only">{color}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personalization Input (if available) */}
              {product.can_personalize === true && (
                <div>
                  <h2 className="text-sm font-medium text-gray-900">Personalization</h2>
                  <div className="mt-2">
                    <textarea
                      value={personalizationText}
                      onChange={(e) => setPersonalizationText(e.target.value)}
                      placeholder="Enter your custom text here"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black resize-y min-h-[80px]"
                      maxLength={1000}
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum 1000 characters. This text will be printed on your product.
                      <span className="ml-1 font-medium">
                        {personalizationText.length}/1000
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h2 className="text-sm font-medium text-gray-900">Quantity</h2>
                <div className="mt-2 flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-gray-900 font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart & Buy Now */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center justify-center space-x-2 bg-white border border-black text-black py-3 px-4 rounded-md hover:bg-gray-100 transition-colors duration-200"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex items-center justify-center space-x-2 bg-black text-white py-3 px-4 rounded-md hover:bg-gray-900 transition-colors duration-200"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span>Buy Now</span>
                  </button>
                </div>
              </div>

              {/* Additional Details */}
              <div className="border-t border-gray-200 pt-6 space-y-4">
                <div>
                  <h2 className="text-sm font-medium text-gray-900">Age Group</h2>
                  <p className="mt-2 text-gray-600 capitalize">{product.age_group}</p>
                </div>

                {product.themes.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-900">Themes</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.themes.map((theme) => (
                        <span
                          key={theme}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews Section */}
                <ProductReviews
                  reviews={reviews}
                  reviewsLoading={reviewsLoading}
                  averageRating={averageRating}
                  reviewCount={reviewCount}
                  canUserReview={canUserReview}
                  onOpenReviewModal={() => setIsReviewModalOpen(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {userOrders.length > 0 && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          productId={id || ''}
          orderId={userOrders[0]?.id || ''}
          productTitle={product?.title || ''}
          productImage={product?.product_images[0]?.url}
          onReviewSubmitted={() => {
            // Refresh reviews after submission
            const fetchReviews = async () => {
              if (!id) return;
              setReviewsLoading(true);
              try {
                console.log('Refreshing reviews after submission');

                // Directly query the database to get the latest reviews
                const { data: directReviews, error: directError } = await supabase
                  .from('product_reviews')
                  .select(`
                    *,
                    profiles:user_id (
                      first_name,
                      last_name,
                      email
                    )
                  `)
                  .eq('product_id', id)
                  .eq('is_published', true)
                  .is('deleted_at', null)
                  .order('created_at', { ascending: false });

                if (directError) {
                  console.error('Error directly querying reviews after submission:', directError);
                } else {
                  console.log('Direct query found reviews after submission:', directReviews);

                  if (directReviews && directReviews.length > 0) {
                    // Process the direct reviews to ensure they have user information
                    const enhancedDirectReviews = directReviews.map(review => {
                      try {
                        // Create a user object from the profile data
                        if (review.profiles) {
                          review.user = {
                            ...review.user,
                            first_name: review.profiles.first_name || '',
                            last_name: review.profiles.last_name || '',
                            email: review.user?.email || review.profiles.email || ''
                          };
                        }

                        return {
                          ...review,
                          product_id: id,
                          order_id: review.order_id || '',
                          is_published: true,
                          updated_at: review.updated_at || review.created_at,
                          deleted_at: null,
                          viewed: false
                        };
                      } catch (err) {
                        console.error('Error enhancing direct review after submission:', err);
                        return review;
                      }
                    });

                    console.log('Setting reviews from direct query after submission:', enhancedDirectReviews);
                    setReviews(enhancedDirectReviews);

                    // Calculate average rating manually
                    const sum = directReviews.reduce((acc, review) => acc + review.rating, 0);
                    const average = sum / directReviews.length;
                    setAverageRating(average);
                    setReviewCount(directReviews.length);
                  }
                }

                // Update canUserReview state
                setCanUserReview(false);
              } catch (err) {
                console.error('Error refreshing reviews:', err);
              } finally {
                setReviewsLoading(false);
              }
            };
            fetchReviews();
          }}
        />
      )}
    </div>
  );
};