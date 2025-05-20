-- Run this script in the Supabase SQL Editor to fix admin access to orders
-- This will allow admin users to view all orders in the system

-- First, drop all existing is_admin functions to avoid conflicts
DO $$
BEGIN
  -- Drop all versions of the is_admin function
  DROP FUNCTION IF EXISTS public.is_admin();
  DROP FUNCTION IF EXISTS public.is_admin(UUID);

  -- You might need to add more DROP statements if there are other versions
  -- with different parameter signatures

  RAISE NOTICE 'Dropped existing is_admin functions';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping functions: %', SQLERRM;
END
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all orders" ON stripe_orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON stripe_orders;

-- Create policy for admins to view all orders
CREATE POLICY "Admins can view all orders"
  ON stripe_orders
  FOR SELECT
  USING (
    -- Allow if the user is in the admin_users table
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Create policy for admins to update all orders
CREATE POLICY "Admins can update all orders"
  ON stripe_orders
  FOR UPDATE
  USING (
    -- Allow if the user is in the admin_users table
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Create a new is_admin function with a specific parameter signature
CREATE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon;

-- Refresh the schema cache to ensure the new policies take effect
NOTIFY pgrst, 'reload schema';

-- Show the current policies on the stripe_orders table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'stripe_orders';
