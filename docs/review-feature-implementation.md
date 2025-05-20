# Product Review Feature Implementation

This document outlines the implementation of the product review feature for the e-commerce application.

## Overview

The review feature allows users to:
- Write reviews for products they've purchased after they've been marked as delivered
- Rate products on a 5-star scale
- Write detailed reviews (up to 1000 characters)

Admins can:
- View all reviews in a dedicated admin dashboard tab
- Delete inappropriate reviews
- Receive notifications for new reviews

## Database Schema

### Table: `product_reviews`

```sql
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES stripe_orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  viewed BOOLEAN DEFAULT FALSE
);
```

### Row Level Security Policies

The following RLS policies are implemented:

1. Users can only create reviews for products they've purchased and received
2. Users can read all published reviews
3. Users can update or delete only their own reviews
4. Admins can manage all reviews

## Components

### 1. ReviewModal Component

- Located at: `src/components/ReviewModal.tsx`
- A popup modal that allows users to:
  - Rate a product (1-5 stars)
  - Write a review (up to 1000 characters)
  - Submit the review to Supabase

### 2. Admin Reviews List Component

- Located at: `src/pages/admin/ReviewsList.tsx`
- Displays all reviews in a table format
- Allows admins to:
  - View review details
  - Delete inappropriate reviews
  - Mark reviews as read/viewed

## Integration Points

### 1. User Dashboard (AccountPage.tsx)

- Added a "Write Review" button for delivered orders
- Integrated the ReviewModal component
- Added logic to check if a user has already reviewed a product

### 2. Product Details Page

- Added a reviews section to display existing reviews
- Shows average rating and total review count
- Displays individual reviews with:
  - Star rating
  - User name
  - Review date
  - Review text

### 3. Admin Dashboard

- Added a new "Reviews" tab
- Integrated with the notification system
- Highlights unread/new reviews

## Services

### ReviewService (src/services/reviewService.ts)

Provides functions for:
- Submitting reviews
- Fetching reviews for a product
- Fetching all reviews for admin dashboard
- Deleting reviews
- Checking if a user has already reviewed a product
- Getting average ratings and review counts

## Notification System Integration

The review feature is integrated with the existing admin notification system:

1. New reviews are marked as unviewed by default
2. The AdminNotificationsContext tracks unviewed reviews
3. The admin dashboard shows a notification badge for new reviews
4. Reviews are marked as viewed when expanded or when "Mark All as Read" is clicked

## Security Considerations

1. Row Level Security ensures users can only:
   - Create reviews for products they've purchased and received
   - Update or delete their own reviews

2. Admins have full access to manage all reviews

3. Input validation ensures:
   - Ratings are between 1-5
   - Review text is limited to 1000 characters

## Testing

To test the review feature:

1. Create an order and mark it as "Delivered" in the admin dashboard
2. Log in as the user who placed the order
3. Go to the user dashboard and find the order in the Orders tab
4. Click the "Write Review" button for a product in the delivered order
5. Submit a review with a rating and text
6. Verify the review appears on the product details page
7. Log in as an admin and check the Reviews tab to see the new review

## Future Enhancements

Potential future enhancements for the review feature:

1. Add photo upload capability for reviews
2. Implement review helpfulness voting (Was this review helpful? Yes/No)
3. Add review sorting and filtering options
4. Implement review moderation workflow for admins
5. Add review analytics in the admin dashboard
