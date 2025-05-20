-- Create function to get average rating for a product
CREATE OR REPLACE FUNCTION get_product_average_rating(product_id UUID)
RETURNS FLOAT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rating FLOAT;
BEGIN
  SELECT AVG(rating)::FLOAT
  INTO avg_rating
  FROM product_reviews
  WHERE product_id = $1
    AND is_published = true
    AND deleted_at IS NULL;
  
  RETURN avg_rating;
END;
$$;

-- Update the AdminNotificationsContext to include reviews
-- Add reviews to the notification counts
CREATE OR REPLACE FUNCTION get_notification_counts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_count INTEGER;
  inquiry_count INTEGER;
  mailing_list_count INTEGER;
  review_count INTEGER;
  result JSON;
BEGIN
  -- Count unviewed orders
  SELECT COUNT(*)
  INTO order_count
  FROM stripe_orders
  WHERE viewed = false;
  
  -- Count unviewed inquiries
  SELECT COUNT(*)
  INTO inquiry_count
  FROM inquiries
  WHERE viewed = false;
  
  -- Count unviewed mailing list entries
  SELECT COUNT(*)
  INTO mailing_list_count
  FROM mailing_list
  WHERE viewed = false;
  
  -- Count unviewed reviews
  SELECT COUNT(*)
  INTO review_count
  FROM product_reviews
  WHERE viewed = false
    AND deleted_at IS NULL;
  
  -- Construct the result JSON
  result := json_build_object(
    'orders', order_count,
    'inquiries', inquiry_count,
    'mailingList', mailing_list_count,
    'reviews', review_count
  );
  
  RETURN result;
END;
$$;
