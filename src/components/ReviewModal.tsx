import React, { useEffect, useRef, useState } from 'react';
import { X, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useToast } from './CustomToast';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  orderId: string;
  productTitle: string;
  productImage?: string;
  onReviewSubmitted?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  productId,
  orderId,
  productTitle,
  productImage,
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const customToast = useToast();

  // Handle clicking outside the modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Restore scrolling when modal is closed
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [reviewText]);

  const handleSubmit = async () => {
    console.log('Submit button clicked');

    // Test both toast systems
    toast.info('Testing react-toastify notification');
    customToast.showToast('Testing custom toast notification', 'info');

    if (rating < 1) {
      console.log('Rating is less than 1');
      customToast.showToast('Please select a rating', 'error');
      return;
    }

    if (reviewText.trim().length < 10) {
      console.log('Review text is too short');
      customToast.showToast('Please write a review with at least 10 characters', 'error');
      return;
    }

    console.log('Setting isSubmitting to true');
    setIsSubmitting(true);

    // Show a loading toast that will be updated with success or error
    console.log('Creating loading toast');
    const customToastId = customToast.showLoading('Submitting your review...');

    try {
      console.log('Starting review submission process');
      console.log('Review details:', {
        productId,
        orderId,
        productTitle,
        rating,
        reviewTextLength: reviewText.length
      });

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to submit a review');
        return;
      }

      console.log('User authenticated:', user.id);
      console.log('User metadata:', user.user_metadata);

      // Get user profile information
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.warn('Error fetching user profile:', profileError);
      } else {
        console.log('User profile data:', profileData);
      }

      // First, check if the product exists
      console.log('Checking if product exists with ID:', productId);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, title')
        .eq('id', productId)
        .single();

      if (productError) {
        console.error('Error checking product:', productError);
        throw new Error('Product not found. Please try again.');
      }

      console.log('Product found:', productData);

      // Check if the order exists
      console.log('Checking if order exists with ID:', orderId);
      const { data: orderData, error: orderError } = await supabase
        .from('stripe_orders')
        .select('id, shipping_status')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error checking order:', orderError);
        throw new Error('Order not found. Please try again.');
      }

      console.log('Order found:', orderData);
      console.log('Submitting review for product:', productId, 'from order:', orderId);

      // Check if a review already exists
      const { data: existingReview, error: existingReviewError } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingReviewError) {
        console.warn('Error checking for existing review:', existingReviewError);
        // Continue anyway
      } else if (existingReview) {
        console.log('User has already reviewed this product:', existingReview);
        toast.info('You have already reviewed this product');
        onClose();
        return;
      }

      // Submit the review to Supabase
      console.log('Inserting review into database');

      // Log user information for debugging
      console.log('Using user information from auth.getUser():', {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      });

      // Log the review text before submission
      console.log('Review text to be submitted:', reviewText);

      const reviewData = {
        user_id: user.id,
        product_id: productId,
        order_id: orderId,
        rating,
        review_text: reviewText.trim(), // Ensure the text is trimmed
        is_published: true,
        viewed: false
      };

      console.log('Review data to insert:', reviewData);

      const { error } = await supabase
        .from('product_reviews')
        .insert(reviewData);

      if (error) {
        console.error('Error inserting review:', error);
        throw error;
      }

      console.log('Review inserted successfully');

      // Verify the review was inserted
      const { data: verifyData, error: verifyError } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('order_id', orderId)
        .single();

      if (verifyError) {
        console.error('Error verifying review insertion:', verifyError);
        // Continue anyway, the review might have been inserted
      } else {
        console.log('Review successfully inserted with ID:', verifyData.id);
      }

      // Update the loading toast to success
      customToast.updateLoading(
        customToastId,
        'Review submitted successfully!',
        'success'
      );

      // Also show a react-toastify toast for comparison
      toast.success('Review submitted successfully!');

      // Reset form
      setRating(5);
      setReviewText('');

      // Call the callback if provided
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }

      // Close the modal without reloading the page
      onClose();
    } catch (error: any) {
      console.error('Error submitting review:', error);

      // Update the loading toast to error
      customToast.updateLoading(
        customToastId,
        `Failed to submit review: ${error.message}`,
        'error'
      );

      // Also show a react-toastify toast for comparison
      toast.error(`Failed to submit review: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-50" aria-hidden="true"></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div
          ref={modalRef}
          className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            {productImage && (
              <div className="flex-shrink-0 w-16 h-16 mx-auto overflow-hidden rounded-md sm:mx-0 sm:h-20 sm:w-20">
                <img src={productImage} alt={productTitle} className="object-cover w-full h-full" />
              </div>
            )}
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-headline">
                Review {productTitle}
              </h3>

              {/* Star Rating */}
              <div className="flex items-center justify-center sm:justify-start mt-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${(hoverRating !== null ? star <= hoverRating : star <= rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                        }`}
                    />
                  </button>
                ))}
              </div>

              {/* Review Text */}
              <div className="mt-4">
                <label htmlFor="review" className="block text-sm font-medium text-gray-700">
                  Your Review
                </label>
                <div className="mt-1">
                  <textarea
                    ref={textareaRef}
                    id="review"
                    name="review"
                    rows={4}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm resize-none"
                    placeholder="Share your experience with this product..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    maxLength={1000}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 text-right">
                  {reviewText.length}/1000 characters
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-black border border-transparent rounded-md shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:ml-3 sm:w-auto sm:text-sm ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              onClick={() => {
                console.log('Submit button clicked directly');
                // Test toast directly
                toast.info('Direct toast test from button click');
                // Call the actual submit handler
                handleSubmit();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              type="button"
              className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
