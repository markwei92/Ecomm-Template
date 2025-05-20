-- This script helps debug admin login issues

-- 1. Check if the admin_users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_users'
) as admin_users_table_exists;

-- 2. Check the structure of the admin_users table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'admin_users';

-- 3. Check RLS policies on admin_users table
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

-- 4. List all users in auth.users
SELECT 
  id, 
  email,
  created_at,
  last_sign_in_at
FROM 
  auth.users
ORDER BY 
  created_at DESC;

-- 5. List all admin users
SELECT 
  a.id as admin_id,
  a.user_id,
  u.email,
  a.role,
  a.created_at
FROM 
  public.admin_users a
JOIN 
  auth.users u ON a.user_id = u.id;

-- 6. Check if a specific user is an admin
DO $$
DECLARE
  user_email TEXT := 'funnyjoketees@gmail.com'; -- Replace with your email
  user_id_var UUID;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO user_id_var FROM auth.users WHERE email = user_email;
  
  IF user_id_var IS NULL THEN
    RAISE NOTICE 'User with email % not found in auth.users', user_email;
  ELSE
    RAISE NOTICE 'User found with ID: %', user_id_var;
    
    -- Check if user is an admin
    IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = user_id_var) THEN
      RAISE NOTICE 'User is an admin';
    ELSE
      RAISE NOTICE 'User is NOT an admin';
      
      -- Add user to admin_users table
      INSERT INTO public.admin_users (user_id)
      VALUES (user_id_var);
      
      RAISE NOTICE 'User added as admin';
    END IF;
  END IF;
END
$$;
