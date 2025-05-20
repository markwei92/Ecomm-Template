-- This script adds a user as an admin
-- Replace 'your-email@example.com' with your actual email

-- Create admin_users table if it doesn't exist
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

-- Create policy for admins to view admin_users
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

-- Get user ID from email and add to admin_users table
DO $$
DECLARE
  user_email TEXT := 'your-email@example.com'; -- REPLACE THIS WITH YOUR EMAIL
  user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = user_id) THEN
    RAISE NOTICE 'User % is already an admin', user_email;
  ELSE
    -- Add user to admin_users table
    INSERT INTO public.admin_users (user_id)
    VALUES (user_id);
    
    RAISE NOTICE 'User % added as admin successfully', user_email;
  END IF;
END
$$;
