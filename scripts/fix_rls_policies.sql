-- This script fixes RLS policies for the admin_users table

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

-- Drop existing policies
DROP POLICY IF EXISTS admin_users_select_policy ON public.admin_users;
DROP POLICY IF EXISTS admin_users_all_policy ON public.admin_users;
DROP POLICY IF EXISTS admin_users_insert_policy ON public.admin_users;
DROP POLICY IF EXISTS admin_users_update_policy ON public.admin_users;
DROP POLICY IF EXISTS admin_users_delete_policy ON public.admin_users;

-- Create new policies
-- Policy for anyone to select from admin_users (this is important for login)
CREATE POLICY admin_users_select_policy ON public.admin_users
  FOR SELECT TO authenticated
  USING (true);

-- Policy for service role to manage admin_users
CREATE POLICY admin_users_all_policy ON public.admin_users
  USING (true);

-- Grant permissions
GRANT ALL ON public.admin_users TO service_role;
GRANT SELECT ON public.admin_users TO authenticated;

-- Show the current policies
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
  tablename = 'admin_users';
