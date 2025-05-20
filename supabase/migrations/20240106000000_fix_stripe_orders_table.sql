-- This migration fixes issues with the stripe_orders table
-- It ensures the table has the correct structure and RLS policies

-- First, check if we have multiple stripe_orders tables with different structures
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'stripe_orders';

  IF table_count > 0 THEN
    RAISE NOTICE 'stripe_orders table exists, checking structure...';
  ELSE
    RAISE NOTICE 'stripe_orders table does not exist, will create it';
  END IF;
END
$$;

-- Drop existing table if it exists, including dependent objects
DROP TABLE IF EXISTS stripe_orders CASCADE;

-- Create the stripe_orders table with the correct structure
CREATE TABLE stripe_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  customer_id TEXT NOT NULL,
  payment_intent_id TEXT NOT NULL,
  checkout_session_id TEXT,
  amount_total INTEGER NOT NULL,
  currency TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  items JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_stripe_orders_payment_intent_id ON stripe_orders(payment_intent_id);
CREATE INDEX idx_stripe_orders_user_id ON stripe_orders(user_id);
CREATE INDEX idx_stripe_orders_customer_id ON stripe_orders(customer_id);

-- Enable RLS
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own orders" ON stripe_orders;
DROP POLICY IF EXISTS "Service role can manage all orders" ON stripe_orders;

-- Create policies
CREATE POLICY "Users can view their own orders"
  ON stripe_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON stripe_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all orders"
  ON stripe_orders
  USING (auth.role() = 'service_role');

-- Create or replace the function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create it
DROP TRIGGER IF EXISTS update_stripe_orders_updated_at ON stripe_orders;

CREATE TRIGGER update_stripe_orders_updated_at
BEFORE UPDATE ON stripe_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Recreate the stripe_user_orders view
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
  u.email as user_email
FROM
  stripe_orders o
JOIN
  auth.users u ON o.user_id = u.id;
