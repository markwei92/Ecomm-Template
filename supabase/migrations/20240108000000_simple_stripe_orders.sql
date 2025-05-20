-- Simple migration to create the stripe_orders table

-- Drop the view if it exists
DROP VIEW IF EXISTS stripe_user_orders;

-- Drop the table if it exists
DROP TABLE IF EXISTS stripe_orders CASCADE;

-- Create the stripe_orders table
CREATE TABLE stripe_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  customer_id TEXT,
  payment_intent_id TEXT,
  checkout_session_id TEXT,
  amount_total INTEGER,
  shipping_cost INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  payment_status TEXT DEFAULT 'succeeded',
  status TEXT DEFAULT 'completed',
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_stripe_orders_user_id ON stripe_orders(user_id);
CREATE INDEX idx_stripe_orders_payment_intent_id ON stripe_orders(payment_intent_id);

-- Enable RLS
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to view their own orders
CREATE POLICY "Users can view their own orders"
  ON stripe_orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create a policy that allows users to insert their own orders
CREATE POLICY "Users can insert their own orders"
  ON stripe_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows the service role to do anything
CREATE POLICY "Service role can do anything"
  ON stripe_orders
  USING (auth.role() = 'service_role');

-- Insert a test order for the current user
INSERT INTO stripe_orders (
  user_id,
  customer_id,
  payment_intent_id,
  amount_total,
  shipping_cost,
  currency,
  payment_status,
  status,
  items
)
SELECT
  auth.uid(),
  'cus_test',
  'pi_test_' || gen_random_uuid(),
  2799,
  400,
  'usd',
  'succeeded',
  'completed',
  '[{"title":"Funny Kawaii Leaf Graphic Tees","price":23.99,"quantity":1,"color":"white","size":"M","image":"/images/products/kawaii-leaf-tee.jpg"}]'::jsonb
WHERE
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid());
