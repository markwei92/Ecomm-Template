/*
  # Add shipping_status column to stripe_orders table
  
  This migration ensures the shipping_status column exists in the stripe_orders table.
  This column is used to track the shipping status of orders and is required for the
  product review feature to work properly.
*/

-- Add shipping_status column to stripe_orders table if it doesn't exist
ALTER TABLE IF EXISTS public.stripe_orders
ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'Order Sent';

-- Create an index on shipping_status for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_orders_shipping_status
ON public.stripe_orders(shipping_status);

-- Update any existing orders that don't have a shipping_status
UPDATE public.stripe_orders
SET shipping_status = 'Order Sent'
WHERE shipping_status IS NULL;
