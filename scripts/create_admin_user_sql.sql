-- This script creates a new admin user with a known password
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

-- Create policies for admin_users table
DO $$
BEGIN
  -- Policy for anyone to select from admin_users (important for login)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_users' AND policyname = 'admin_users_select_policy'
  ) THEN
    CREATE POLICY admin_users_select_policy ON public.admin_users
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END
$$;

-- Grant permissions
GRANT SELECT ON public.admin_users TO authenticated;

-- Create a new admin user
DO $$
DECLARE
  admin_email TEXT := 'funnyjoketees@gmail.com'; -- REPLACE WITH YOUR DESIRED EMAIL
  admin_password TEXT := 'EcomPassword2025$'; -- REPLACE WITH YOUR DESIRED PASSWORD
  new_user_id UUID;
  instance_id_var UUID;
BEGIN
  -- Get instance_id from an existing user
  SELECT instance_id INTO instance_id_var FROM auth.users LIMIT 1;
  
  IF instance_id_var IS NULL THEN
    RAISE EXCEPTION 'No existing users found to get instance_id';
  END IF;

  -- Check if user with this email already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = admin_email;
  
  IF new_user_id IS NULL THEN
    -- Create new user
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      new_user_id,
      instance_id_var,
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
    
    RAISE NOTICE 'Created new user with ID: %', new_user_id;
  ELSE
    -- Update existing user's password
    UPDATE auth.users
    SET 
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      updated_at = NOW(),
      last_sign_in_at = NOW()
    WHERE id = new_user_id;
    
    RAISE NOTICE 'Updated password for existing user with ID: %', new_user_id;
  END IF;
  
  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = new_user_id) THEN
    RAISE NOTICE 'User is already an admin';
  ELSE
    -- Add user to admin_users table
    INSERT INTO public.admin_users (user_id)
    VALUES (new_user_id);
    
    RAISE NOTICE 'User added as admin successfully';
  END IF;
  
  RAISE NOTICE 'Admin user setup complete!';
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Password: %', admin_password;
END
$$;
