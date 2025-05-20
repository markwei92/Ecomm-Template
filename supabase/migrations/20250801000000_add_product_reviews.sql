/*
  # Product Reviews Schema

  1. New Tables
    - `product_reviews`: Stores user reviews for products
      - Links to users and products
      - Includes rating (1-5 stars) and review text
      - Tracks creation and update timestamps
      - Implements soft delete pattern

  2. Security
    - Enables Row Level Security (RLS)
    - Implements policies for users to:
      - Create reviews for products they've purchased and received
      - Read all published reviews
      - Update or delete only their own reviews
    - Implements policies for admins to manage all reviews
*/

-- Create product_reviews table
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
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id ON public.product_reviews(order_id);

-- Add viewed column for admin notifications
ALTER TABLE public.product_reviews
ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_product_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_reviews_updated_at();

-- Enable Row Level Security
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can create reviews for products they've purchased"
  ON public.product_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM stripe_orders o
      WHERE o.user_id = auth.uid()
      AND (o.shipping_status = 'Delivered' OR o.shipping_status = 'delivered')
      AND o.id = order_id
    )
  );

CREATE POLICY "Users can read all published reviews"
  ON public.product_reviews
  FOR SELECT
  TO public
  USING (is_published = true AND deleted_at IS NULL);

CREATE POLICY "Users can update their own reviews"
  ON public.product_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.product_reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for admins
CREATE POLICY "Admins can manage all reviews"
  ON public.product_reviews
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );
