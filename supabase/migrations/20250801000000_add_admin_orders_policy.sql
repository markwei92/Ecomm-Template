-- Add a policy to allow admin users to view all orders
-- This migration adds a new RLS policy to the stripe_orders table
-- that allows admin users to view all orders, not just their own

-- First, check if the policy already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_orders' AND policyname = 'Admins can view all orders'
  ) THEN
    -- Create the new policy
    CREATE POLICY "Admins can view all orders"
      ON stripe_orders
      FOR SELECT
      USING (
        -- Allow if the user is in the admin_users table
        auth.uid() IN (SELECT user_id FROM admin_users)
      );
      
    RAISE NOTICE 'Created new policy: Admins can view all orders';
  ELSE
    RAISE NOTICE 'Policy already exists, skipping creation';
  END IF;
END
$$;

-- Also add a policy to allow admins to update orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_orders' AND policyname = 'Admins can update all orders'
  ) THEN
    -- Create the new policy
    CREATE POLICY "Admins can update all orders"
      ON stripe_orders
      FOR UPDATE
      USING (
        -- Allow if the user is in the admin_users table
        auth.uid() IN (SELECT user_id FROM admin_users)
      );
      
    RAISE NOTICE 'Created new policy: Admins can update all orders';
  ELSE
    RAISE NOTICE 'Policy already exists, skipping creation';
  END IF;
END
$$;

-- Create a function to check if a user is an admin if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_admin' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Create the function
    CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = check_user_id
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    RAISE NOTICE 'Created is_admin function';
  ELSE
    RAISE NOTICE 'is_admin function already exists, skipping creation';
  END IF;
END
$$;

-- Refresh the schema cache to ensure the new policies take effect
NOTIFY pgrst, 'reload schema';
