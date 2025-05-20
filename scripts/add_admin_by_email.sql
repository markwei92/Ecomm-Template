-- This script adds a user as an admin by email
-- Replace the email with your actual email

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

-- Create policies for admin_users table
DO $$
BEGIN
  -- Policy for admins to view admin_users
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_users' AND policyname = 'admin_users_select_policy'
  ) THEN
    CREATE POLICY admin_users_select_policy ON public.admin_users
      FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );
  END IF;
  
  -- Policy for service role to manage admin_users
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_users' AND policyname = 'admin_users_all_policy'
  ) THEN
    CREATE POLICY admin_users_all_policy ON public.admin_users
      USING (true);
  END IF;
END
$$;

-- Add the user as an admin by email
DO $$
DECLARE
  user_email TEXT := 'funnyjoketees@gmail.com'; -- Replace with your email
  user_id_var UUID;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO user_id_var FROM auth.users WHERE email = user_email;
  
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = user_id_var) THEN
    RAISE NOTICE 'User with email % is already an admin', user_email;
  ELSE
    -- Add user to admin_users table
    INSERT INTO public.admin_users (user_id)
    VALUES (user_id_var);
    
    RAISE NOTICE 'User with email % added as admin successfully', user_email;
  END IF;
END
$$;
