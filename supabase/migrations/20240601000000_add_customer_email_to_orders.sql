-- Add customer_email column to stripe_orders table
ALTER TABLE IF EXISTS public.stripe_orders
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Create an index on customer_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_orders_customer_email
ON public.stripe_orders(customer_email);

-- Update the stripe_user_orders view to include customer_email
CREATE OR REPLACE VIEW stripe_user_orders AS
SELECT
  o.id,
  o.user_id,
  o.payment_intent_id,
  o.checkout_session_id,
  o.amount_total,
  o.currency,
  o.payment_status,
  o.status,
  o.items,
  o.created_at,
  o.customer_email,
  u.email as user_email
FROM
  stripe_orders o
JOIN
  auth.users u ON o.user_id = u.id;

-- Backfill customer_email from Stripe where possible
-- This is a placeholder - you'll need to run this manually or through a script
-- since we can't make API calls to Stripe from SQL
COMMENT ON COLUMN stripe_orders.customer_email IS 
'Customer email from Stripe. This is populated from the Stripe customer record when available.';
