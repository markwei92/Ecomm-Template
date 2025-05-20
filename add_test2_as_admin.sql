-- Run this script in the Supabase SQL Editor to add test2@test2.com as an admin
-- This will ensure that test2@test2.com can see all orders

-- First, make sure the admin_users table exists
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'admin',
  UNIQUE(user_id)
);

-- Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view admin_users if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_users' AND policyname = 'admin_users_select_policy'
  ) THEN
    CREATE POLICY admin_users_select_policy ON public.admin_users
      FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );
  END IF;
END
$$;

-- Add test2@test2.com as an admin
DO $$
DECLARE
  found_user_id UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO found_user_id FROM auth.users WHERE email = 'test2@test2.com';

  IF found_user_id IS NULL THEN
    RAISE NOTICE 'User with email test2@test2.com not found';
    RETURN;
  END IF;

  -- Check if the user is already an admin
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = found_user_id) THEN
    RAISE NOTICE 'User test2@test2.com is already an admin';
  ELSE
    -- Add the user to admin_users
    INSERT INTO admin_users (user_id, role)
    VALUES (found_user_id, 'admin');

    RAISE NOTICE 'User test2@test2.com added as admin';
  END IF;

  -- Show all admin users
  RAISE NOTICE 'Current admin users:';
END
$$;

-- List all admin users with their email addresses
SELECT
  a.id as admin_id,
  a.user_id,
  u.email,
  a.role,
  a.created_at
FROM
  public.admin_users a
JOIN
  auth.users u ON a.user_id = u.id
ORDER BY
  a.created_at DESC;
