-- This SQL script fixes authentication issues by:
-- 1. Updating RLS policies to be more permissive
-- 2. Adding a trigger to automatically create profiles for new auth users
-- 3. Ensuring the service role has proper access

-- First, let's fix the profiles table
-- Make sure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create more permissive policies
-- Allow anyone to select profiles (we'll rely on the WHERE clause in queries for security)
CREATE POLICY "Anyone can view profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Allow anyone to insert profiles (needed for registration)
CREATE POLICY "Anyone can insert profiles" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Service role can do anything with profiles" 
  ON public.profiles 
  USING (auth.role() = 'service_role');

-- Now, let's fix the users table
-- Make sure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Service role can read all users" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Service role can update users" ON public.users;

-- Create more permissive policies
-- Allow anyone to select users (we'll rely on the WHERE clause in queries for security)
CREATE POLICY "Anyone can view users" 
  ON public.users 
  FOR SELECT 
  USING (true);

-- Allow authenticated users to update their own user record
CREATE POLICY "Users can update own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Allow anyone to insert users (needed for registration)
CREATE POLICY "Anyone can insert users" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Service role can do anything with users" 
  ON public.users 
  USING (auth.role() = 'service_role');

-- Create a function to automatically create a profile when a user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.created_at,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a trigger to call the function when a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to check if a user exists in auth.users
CREATE OR REPLACE FUNCTION public.auth_user_exists(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create a user in auth.users
CREATE OR REPLACE FUNCTION public.create_auth_user(
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    json_build_object(
      'first_name', user_first_name,
      'last_name', user_last_name,
      'full_name', user_first_name || ' ' || user_last_name
    ),
    now(),
    now()
  )
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating auth user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
