-- Add discount columns to stripe_orders table
-- This migration adds the missing discount-related columns that are needed for promo code functionality

-- Add discount_amount column (stores discount in cents)
ALTER TABLE IF EXISTS public.stripe_orders
ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;

-- Add discount_type column (stores 'percentage' or 'fixed')
ALTER TABLE IF EXISTS public.stripe_orders
ADD COLUMN IF NOT EXISTS discount_type TEXT;

-- Add discount_percentage column (stores the percentage value for percentage discounts)
ALTER TABLE IF EXISTS public.stripe_orders
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER;

-- Add promo_code column (stores the promo code that was applied)
ALTER TABLE IF EXISTS public.stripe_orders
ADD COLUMN IF NOT EXISTS promo_code TEXT;

-- Add shipping_address column if it doesn't exist
ALTER TABLE IF EXISTS public.stripe_orders
ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Add is_guest column if it doesn't exist
ALTER TABLE IF EXISTS public.stripe_orders
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_orders_promo_code
ON public.stripe_orders(promo_code);

CREATE INDEX IF NOT EXISTS idx_stripe_orders_is_guest
ON public.stripe_orders(is_guest);

-- Add comments to document the columns
COMMENT ON COLUMN stripe_orders.discount_amount IS 'Discount amount in cents';
COMMENT ON COLUMN stripe_orders.discount_type IS 'Type of discount: percentage or fixed';
COMMENT ON COLUMN stripe_orders.discount_percentage IS 'Percentage value for percentage discounts';
COMMENT ON COLUMN stripe_orders.promo_code IS 'Promo code that was applied to this order';
COMMENT ON COLUMN stripe_orders.shipping_address IS 'Shipping address for the order';
COMMENT ON COLUMN stripe_orders.is_guest IS 'Whether this order was placed by a guest user';
