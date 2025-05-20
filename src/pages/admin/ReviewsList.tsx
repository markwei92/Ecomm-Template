import React, { useState, useEffect } from 'react';
import { Search, Star, Trash2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Package, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useAdminNotifications } from '../../context/AdminNotificationsContext';
import { Review, getAllReviews, deleteReview, createAdminReview } from '../../services/reviewService';
import { getProductDetailsById, getAllProducts } from '../../services/productService';

export const ReviewsList: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [productDetails, setProductDetails] = useState<Record<string, any>>({});
  const [loadingProducts, setLoadingProducts] = useState<Record<string, boolean>>({});
  const { markReviewsAsViewed, markReviewAsViewed } = useAdminNotifications();

  // Admin review form state
  const [showAdminReviewForm, setShowAdminReviewForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProductsList, setLoadingProductsList] = useState(false);
  const [adminReviewForm, setAdminReviewForm] = useState({
    productId: '',
    name: '',
    rating: 5,
    reviewText: ''
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchProductsForDropdown();
  }, []);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const reviewsData = await getAllReviews();
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;

    try {
      await deleteReview(reviewToDelete);
      setReviews(reviews.filter(review => review.id !== reviewToDelete));
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    } finally {
      setReviewToDelete(null);
      setShowDeleteConfirmation(false);
    }
  };

  const fetchProductDetails = async (productId: string) => {
    if (!productId || productDetails[productId]) return;

    try {
      setLoadingProducts(prev => ({ ...prev, [productId]: true }));
      const product = await getProductDetailsById(productId);

      if (product) {
        setProductDetails(prev => ({ ...prev, [productId]: product }));
      }
    } catch (error) {
      console.error(`Error fetching product details for ${productId}:`, error);
    } finally {
      setLoadingProducts(prev => ({ ...prev, [productId]: false }));
    }
  };

  const fetchProductsForDropdown = async () => {
    try {
      setLoadingProductsList(true);
      const productsData = await getAllProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products for dropdown:', error);
      toast.error('Failed to load products');
    } finally {
      setLoadingProductsList(false);
    }
  };

  const handleExpandReview = (reviewId: string) => {
    if (expandedReviewId === reviewId) {
      setExpandedReviewId(null);
    } else {
      setExpandedReviewId(reviewId);

      // Mark as viewed when expanded
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        // Mark as viewed if not already viewed
        if (!review.viewed) {
          markReviewAsViewed(reviewId);
          // Update local state
          setReviews(reviews.map(r =>
            r.id === reviewId ? { ...r, viewed: true } : r
          ));
        }

        // Fetch product details if we have a product ID
        if (review.product_id) {
          fetchProductDetails(review.product_id);
        }
      }
    }
  };

  // Filter reviews based on search query
  const filteredReviews = reviews.filter(review => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (review.user?.email?.toLowerCase().includes(searchLower) || false) ||
      (review.review_text.toLowerCase().includes(searchLower)) ||
      (review.user?.first_name?.toLowerCase().includes(searchLower) || false) ||
      (review.user?.last_name?.toLowerCase().includes(searchLower) || false)
    );
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle admin review form input changes
  const handleAdminReviewFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAdminReviewForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle admin review form submission
  const handleAdminReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { productId, name, rating, reviewText } = adminReviewForm;

    if (!productId || !name || !reviewText) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSubmittingReview(true);
      console.log('Submitting admin review with data:', {
        productId,
        name,
        rating: Number(rating),
        reviewText
      });

      const newReview = await createAdminReview(
        productId,
        name,
        Number(rating),
        reviewText
      );

      console.log('Successfully created review:', newReview);

      // Add the new review to the list
      setReviews(prev => [newReview, ...prev]);

      // Reset the form
      setAdminReviewForm({
        productId: '',
        name: '',
        rating: 5,
        reviewText: ''
      });

      // Hide the form
      setShowAdminReviewForm(false);

      toast.success('Review created successfully');
    } catch (error: any) {
      console.error('Error creating admin review:', error);

      // Show more detailed error message if available
      if (error.message) {
        toast.error(`Failed to create review: ${error.message}`);
      } else if (error.error_description) {
        toast.error(`Failed to create review: ${error.error_description}`);
      } else if (typeof error === 'object' && error !== null) {
        toast.error(`Failed to create review: ${JSON.stringify(error)}`);
      } else {
        toast.error('Failed to create review. Please try again.');
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Render stars for rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Product Reviews</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage customer reviews for your products
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
          <button
            onClick={() => {
              markReviewsAsViewed();
              // Update local state
              setReviews(reviews.map(r => ({ ...r, viewed: true })));
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All as Read
          </button>
          <button
            onClick={() => setShowAdminReviewForm(!showAdminReviewForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showAdminReviewForm ? 'Hide Form' : 'Add Review'}
          </button>
        </div>
      </div>

      {/* Admin Review Form */}
      {showAdminReviewForm && (
        <div className="mt-6 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Add New Review</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Create a new review for any product. This will appear as a regular user review.</p>
            </div>
            <form onSubmit={handleAdminReviewSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
                  Product
                </label>
                <select
                  id="productId"
                  name="productId"
                  value={adminReviewForm.productId}
                  onChange={handleAdminReviewFormChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="">Select a product</option>
                  {loadingProductsList ? (
                    <option value="" disabled>Loading products...</option>
                  ) : (
                    products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Reviewer Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={adminReviewForm.name}
                  onChange={handleAdminReviewFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-gray-700">
                  Star Rating
                </label>
                <select
                  id="rating"
                  name="rating"
                  value={adminReviewForm.rating}
                  onChange={handleAdminReviewFormChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
                <div className="mt-1">
                  {renderStars(Number(adminReviewForm.rating))}
                </div>
              </div>

              <div>
                <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700">
                  Review Description
                </label>
                <textarea
                  id="reviewText"
                  name="reviewText"
                  rows={4}
                  value={adminReviewForm.reviewText}
                  onChange={handleAdminReviewFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Write your review here..."
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdminReviewForm(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="mt-6 flex flex-col sm:flex-row">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Reviews list */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No reviews found</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        User
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Rating
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredReviews.map((review) => (
                      <React.Fragment key={review.id}>
                        <tr
                          className={`${!review.viewed ? 'bg-yellow-50' : ''} hover:bg-gray-50 cursor-pointer`}
                          onClick={() => handleExpandReview(review.id)}
                        >
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div className="flex items-center">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {review.review_text && review.review_text.startsWith('[ADMIN_REVIEW][')
                                    ? (() => {
                                      const match = review.review_text.match(/\[ADMIN_REVIEW\]\[(.*?)\]/);
                                      return match && match[1] ? match[1] : "Anonymous";
                                    })()
                                    : review._adminReviewerName
                                      ? review._adminReviewerName
                                      : review.user && (review.user.first_name || review.user.last_name)
                                        ? `${review.user.first_name || ''} ${review.user.last_name || ''}`.trim()
                                        : "Anonymous"}
                                  {(review._isAdminReview || (review.review_text && review.review_text.startsWith('[ADMIN_REVIEW]['))) && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      Admin Created
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-500">
                                  {(review._isAdminReview || (review.review_text && review.review_text.startsWith('[ADMIN_REVIEW][')))
                                    ? "Admin Review"
                                    : review.user?.email || "No email"}
                                </div>
                                <div className="text-xs text-gray-400">
                                  ID: {review.user_id ? review.user_id.substring(0, 8) + '...' : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {renderStars(review.rating)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatDate(review.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {review.is_published ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Hidden
                              </span>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex items-center justify-end space-x-2">
                              {expandedReviewId === review.id ? (
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReviewToDelete(review.id);
                                  setShowDeleteConfirmation(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedReviewId === review.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="flex flex-col space-y-4">
                                {/* Product information */}
                                <div className="bg-gray-100 p-3 rounded-md">
                                  <div className="flex items-start">
                                    <Package className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                                    <div>
                                      <h4 className="font-medium text-gray-900">Product Information</h4>
                                      {loadingProducts[review.product_id] ? (
                                        <div className="text-sm text-gray-500">Loading product details...</div>
                                      ) : productDetails[review.product_id] ? (
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">
                                            {productDetails[review.product_id].title}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            ${productDetails[review.product_id].price.toFixed(2)}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                            Product ID: {review.product_id}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-500">
                                          Product ID: {review.product_id}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Review text */}
                                <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded-md border border-gray-200">
                                  <h4 className="font-medium text-gray-900 mb-2">Review Text:</h4>
                                  {typeof review === 'object' && review !== null ? (
                                    review.review_text ? (
                                      <span>
                                        {review.review_text && review.review_text.startsWith('[ADMIN_REVIEW][')
                                          ? review.review_text.replace(/\[ADMIN_REVIEW\]\[.*?\]\s*/, '')
                                          : review.review_text}
                                      </span>
                                    ) : (
                                      <span className="text-red-500">No review text provided.</span>
                                    )
                                  ) : (
                                    <span className="text-red-500">Invalid review object</span>
                                  )}
                                </div>
                              </div>
                              {/* Debug information */}
                              {process.env.NODE_ENV === 'development' && (
                                <details className="mt-2 text-xs text-gray-400" open>
                                  <summary>Debug Info</summary>
                                  <div className="mt-2 mb-2 p-2 bg-gray-100 rounded">
                                    <strong>Review ID:</strong> {review.id}<br />
                                    <strong>Product ID:</strong> {review.product_id}<br />
                                    <strong>User ID:</strong> {review.user_id || 'N/A'}<br />
                                    <strong>Rating:</strong> {review.rating}<br />
                                    <strong>Review Text Length:</strong> {review.review_text ? review.review_text.length : 0} characters<br />
                                    <strong>Is Published:</strong> {review.is_published ? 'Yes' : 'No'}<br />
                                    <strong>Created At:</strong> {new Date(review.created_at).toLocaleString()}<br />
                                    <strong>Is Admin Review:</strong> {(review._isAdminReview || (review.review_text && review.review_text.startsWith('[ADMIN_REVIEW]['))) ? 'Yes' : 'No'}<br />
                                    {(review._isAdminReview || (review.review_text && review.review_text.startsWith('[ADMIN_REVIEW]['))) && (
                                      <><strong>Admin Reviewer Name:</strong> {
                                        review.review_text && review.review_text.startsWith('[ADMIN_REVIEW][')
                                          ? (() => {
                                            const match = review.review_text.match(/\[ADMIN_REVIEW\]\[(.*?)\]/);
                                            return match && match[1] ? match[1] : "Unknown";
                                          })()
                                          : review._adminReviewerName || "Unknown"
                                      }<br /></>
                                    )}
                                    <strong>Has User Data:</strong> {review.user ? 'Yes' : 'No'}<br />
                                    <strong>Has Profile Data:</strong> {review.profiles ? 'Yes' : 'No'}<br />
                                  </div>
                                  <details>
                                    <summary>User Information</summary>
                                    <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                                      {JSON.stringify(review.user || {}, null, 2)}
                                    </pre>
                                  </details>
                                  <details>
                                    <summary>Full Review Object</summary>
                                    <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                                      {JSON.stringify({
                                        id: review.id,
                                        user_id: review.user_id,
                                        product_id: review.product_id,
                                        order_id: review.order_id,
                                        review_text: review.review_text,
                                        rating: review.rating,
                                        is_published: review.is_published,
                                        created_at: review.created_at,
                                        updated_at: review.updated_at,
                                        deleted_at: review.deleted_at,
                                        _isAdminReview: review._isAdminReview,
                                        _adminReviewerName: review._adminReviewerName,
                                        has_user: !!review.user,
                                        has_profile: !!review.profiles,
                                        user_fields: review.user ? Object.keys(review.user) : [],
                                        profile_fields: review.profiles ? Object.keys(review.profiles) : []
                                      }, null, 2)}
                                    </pre>
                                  </details>
                                </details>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteReview}
        onCancel={() => {
          setReviewToDelete(null);
          setShowDeleteConfirmation(false);
        }}
        type="danger"
      />
    </div>
  );
};
