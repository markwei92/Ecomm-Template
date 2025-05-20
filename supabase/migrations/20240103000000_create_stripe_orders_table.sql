-- Create the stripe_orders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_orders'
  ) THEN
    CREATE TABLE stripe_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      customer_id TEXT NOT NULL,
      payment_intent_id TEXT NOT NULL,
      checkout_session_id TEXT,
      amount_total INTEGER NOT NULL,
      currency TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      status TEXT NOT NULL,
      items JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Create indexes
    CREATE INDEX idx_stripe_orders_payment_intent_id ON stripe_orders(payment_intent_id);
    CREATE INDEX idx_stripe_orders_user_id ON stripe_orders(user_id);
    CREATE INDEX idx_stripe_orders_customer_id ON stripe_orders(customer_id);

    -- Enable RLS
    ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view their own orders"
      ON stripe_orders
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Service role can manage all orders"
      ON stripe_orders
      USING (auth.role() = 'service_role');
  ELSE
    RAISE NOTICE 'Table stripe_orders already exists, skipping creation';
  END IF;
END
$$;

-- Create function to update updated_at if it doesn't exist
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
