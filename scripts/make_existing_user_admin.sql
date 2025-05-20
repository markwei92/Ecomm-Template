-- This script makes an existing user an admin
-- Replace the user_id with your actual user ID

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

-- Make an existing user an admin
DO $$
DECLARE
  user_id_param UUID := 'your-user-id-here'::UUID; -- REPLACE THIS WITH YOUR USER ID
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_param) THEN
    RAISE EXCEPTION 'User with ID % not found', user_id_param;
  END IF;
  
  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = user_id_param) THEN
    RAISE NOTICE 'User with ID % is already an admin', user_id_param;
  ELSE
    -- Add user to admin_users table
    INSERT INTO public.admin_users (user_id)
    VALUES (user_id_param);
    
    RAISE NOTICE 'User with ID % added as admin successfully', user_id_param;
  END IF;
END
$$;
