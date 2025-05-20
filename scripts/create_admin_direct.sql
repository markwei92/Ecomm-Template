-- This script creates a new admin user by directly inserting into auth.users
-- Replace the email and password with your desired values

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

-- Create a new admin user directly
DO $$
DECLARE
  new_user_id UUID;
  admin_email TEXT := 'admin@example.com'; -- REPLACE WITH YOUR DESIRED EMAIL
  admin_password TEXT := 'StrongPassword123!'; -- REPLACE WITH YOUR DESIRED PASSWORD
BEGIN
  -- Check if user with this email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    RAISE EXCEPTION 'User with email % already exists', admin_email;
  END IF;

  -- Generate a new UUID for the user
  new_user_id := extensions.uuid_generate_v4();
  
  -- Insert the user directly into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    (SELECT instance_id FROM auth.users LIMIT 1), -- Get instance_id from an existing user
    admin_email,
    extensions.crypt(admin_password, extensions.gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW()
  );

  -- Add the user to admin_users table
  INSERT INTO public.admin_users (user_id)
  VALUES (new_user_id);
  
  RAISE NOTICE 'Admin user created successfully with email: % and ID: %', admin_email, new_user_id;
END
$$;
