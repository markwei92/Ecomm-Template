-- This script checks the structure of the admin_users table

-- Check if admin_users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_users'
) as table_exists;

-- Show table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'admin_users';

-- Show all rows in admin_users table
SELECT * FROM public.admin_users;

-- Show RLS policies on admin_users table
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

-- Check if the user is in the admin_users table
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
WHERE 
  u.email = 'funnyjoketees@gmail.com'; -- REPLACE WITH YOUR EMAIL
