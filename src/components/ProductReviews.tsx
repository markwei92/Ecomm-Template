import React from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Review } from '../services/reviewService';

interface ProductReviewsProps {
  reviews: Review[];
  reviewsLoading: boolean;
  averageRating: number | null;
  reviewCount: number;
  canUserReview: boolean;
  onOpenReviewModal: () => void;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  reviews,
  reviewsLoading,
  averageRating,
  reviewCount,
  canUserReview,
  onOpenReviewModal
}) => {
  // Helper function to render stars for ratings
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to get the user's display name from a review
  const getUserDisplayName = (review: Review): string => {
    if (!review) {
      return 'Anonymous';
    }

    try {
      // Check if this is an admin review with the name in the review text
      if (review.review_text && review.review_text.startsWith('[ADMIN_REVIEW][')) {
        // Extract the name from the review text format: [ADMIN_REVIEW][Name] Review text
        const match = review.review_text.match(/\[ADMIN_REVIEW\]\[(.*?)\]/);
        if (match && match[1]) {
          return match[1]; // Return the captured name
        }
      }

      // First check if this is an admin review with a custom name (for backward compatibility)
      if (review._adminReviewerName) {
        return review._adminReviewerName;
      }

      // Check if we have first and last name
      if (review.user?.first_name || review.profiles?.first_name) {
        const firstName = review.user?.first_name || review.profiles?.first_name;
        const lastName = review.user?.last_name || review.profiles?.last_name;

        if (firstName && lastName) {
          return `${firstName} ${lastName}`;
        }

        if (firstName) {
          return firstName;
        }
      }

      // Fall back to email if available
      if (review.user?.email) {
        const username = review.user.email.split('@')[0];
        return username;
      }

      // Last resort - check if we have any user ID
      if (review.user_id) {
        const shortId = review.user_id.substring(0, 8);
        return `User ${shortId}`;
      }
    } catch (error) {
      console.error('Error in getUserDisplayName:', error);
    }

    return 'Anonymous';
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 md:mb-0">Customer Reviews</h2>
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
          {canUserReview && (
            <button
              onClick={onOpenReviewModal}
              className="flex items-center text-sm font-medium text-black hover:text-gray-700 mb-2 md:mb-0"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Write a Review
            </button>
          )}
          {averageRating !== null && (
            <div className="flex items-center">
              {renderStars(averageRating)}
              <span className="ml-2 text-sm text-gray-600">
                {averageRating.toFixed(1)} out of 5 ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>
      </div>

      {reviewsLoading ? (
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    {renderStars(review.rating)}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {getUserDisplayName(review)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{formatDate(review.created_at)}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {review.review_text && review.review_text.startsWith('[ADMIN_REVIEW][')
                      ? review.review_text.replace(/\[ADMIN_REVIEW\]\[.*?\]\s*/, '')
                      : review.review_text || "No review text provided."}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
