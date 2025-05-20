-- This migration fixes issues with the stripe_orders table
-- while preserving existing data

-- First, check if the stripe_orders table exists
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'stripe_orders'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE 'stripe_orders table exists, will preserve data';
  ELSE
    RAISE NOTICE 'stripe_orders table does not exist, will create it';
  END IF;
END
$$;

-- Create a backup of existing orders if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'stripe_orders'
  ) THEN
    -- Create a backup table
    CREATE TABLE IF NOT EXISTS stripe_orders_backup AS
    SELECT * FROM stripe_orders;
    
    RAISE NOTICE 'Created backup of stripe_orders data';
  END IF;
END
$$;

-- Drop dependent views if they exist
DROP VIEW IF EXISTS stripe_user_orders;

-- Alter the table structure if it exists, or create it if it doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'stripe_orders'
  ) THEN
    -- Table exists, check if it has the required columns
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'user_id'
    ) THEN
      -- Add missing columns
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'customer_id'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS customer_id TEXT;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'payment_intent_id'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'checkout_session_id'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'amount_total'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS amount_total INTEGER;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'currency'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'payment_status'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'succeeded';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'status'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'items'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS items JSONB;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stripe_orders' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    RAISE NOTICE 'Updated stripe_orders table structure';
  ELSE
    -- Table doesn't exist, create it
    CREATE TABLE stripe_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      customer_id TEXT,
      payment_intent_id TEXT,
      checkout_session_id TEXT,
      amount_total INTEGER,
      currency TEXT DEFAULT 'usd',
      payment_status TEXT DEFAULT 'succeeded',
      status TEXT DEFAULT 'completed',
      items JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    RAISE NOTICE 'Created new stripe_orders table';
  END IF;
END
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_orders_payment_intent_id ON stripe_orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_orders_user_id ON stripe_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_orders_customer_id ON stripe_orders(customer_id);

-- Enable RLS
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own orders" ON stripe_orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON stripe_orders;
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

-- Restore data from backup if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'stripe_orders_backup'
  ) THEN
    -- Check if the backup table has data
    DECLARE
      backup_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO backup_count FROM stripe_orders_backup;
      
      IF backup_count > 0 THEN
        -- Insert data from backup, avoiding duplicates
        INSERT INTO stripe_orders (
          id, user_id, customer_id, payment_intent_id, checkout_session_id,
          amount_total, currency, payment_status, status, items, created_at, updated_at
        )
        SELECT 
          b.id, b.user_id, b.customer_id, b.payment_intent_id, b.checkout_session_id,
          b.amount_total, b.currency, b.payment_status, b.status, b.items, b.created_at, b.updated_at
        FROM 
          stripe_orders_backup b
        WHERE 
          NOT EXISTS (
            SELECT 1 FROM stripe_orders o 
            WHERE o.id = b.id OR (o.payment_intent_id IS NOT NULL AND o.payment_intent_id = b.payment_intent_id)
          );
          
        RAISE NOTICE 'Restored data from backup';
      ELSE
        RAISE NOTICE 'Backup table is empty, no data to restore';
      END IF;
    END;
  END IF;
END
$$;
