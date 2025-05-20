-- Create the stripe_customers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_customers'
  ) THEN
    CREATE TABLE stripe_customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      customer_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    -- Create unique indexes
    CREATE UNIQUE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id) WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX idx_stripe_customers_customer_id ON stripe_customers(customer_id) WHERE deleted_at IS NULL;

    -- Enable RLS
    ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view their own customer record"
      ON stripe_customers
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Service role can manage all customer records"
      ON stripe_customers
      USING (auth.role() = 'service_role');
  ELSE
    RAISE NOTICE 'Table stripe_customers already exists, skipping creation';
  END IF;
END
$$;

-- Drop trigger if exists and create it
DROP TRIGGER IF EXISTS update_stripe_customers_updated_at ON stripe_customers;

CREATE TRIGGER update_stripe_customers_updated_at
BEFORE UPDATE ON stripe_customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
