-- This script fixes any issues with the admin_users table

-- Drop the admin_users table if it exists (CAUTION: This will delete all admin users)
-- Uncomment the next line if you want to recreate the table from scratch
-- DROP TABLE IF EXISTS public.admin_users;

-- Create the admin_users table with the correct structure
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

-- Drop existing policies (if any)
DROP POLICY IF EXISTS admin_users_select_policy ON public.admin_users;
DROP POLICY IF EXISTS admin_users_all_policy ON public.admin_users;

-- Create new policies
-- Policy for admins to view admin_users
CREATE POLICY admin_users_select_policy ON public.admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Policy for service role to manage admin_users
CREATE POLICY admin_users_all_policy ON public.admin_users
  USING (true);

-- Grant permissions to authenticated users
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
