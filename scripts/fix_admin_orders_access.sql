-- This script adds policies to allow admin users to view all orders
-- Run this in the Supabase SQL Editor

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

-- Make sure the is_admin function exists
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;

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
