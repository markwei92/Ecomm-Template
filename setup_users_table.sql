-- This SQL script creates a custom users table for our application
-- Run this in the Supabase SQL Editor

-- Check if the table exists first
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    RAISE NOTICE 'Table users already exists, skipping creation';
  ELSE
    -- Create users table
    CREATE TABLE public.users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      full_name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    RAISE NOTICE 'Table users created successfully';
  END IF;
END
$$;

-- Add RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;

CREATE POLICY "Users can read their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy to allow users to update their own data
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Create policy to allow anyone to insert data (for registration)
-- This policy is more permissive to ensure registration works
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;

CREATE POLICY "Anyone can insert users"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow service role to read all users
DROP POLICY IF EXISTS "Service role can read all users" ON public.users;

CREATE POLICY "Service role can read all users"
  ON public.users
  FOR SELECT
  TO service_role
  USING (true);

-- Create policy to allow service role to insert users
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create policy to allow service role to update users
DROP POLICY IF EXISTS "Service role can update users" ON public.users;

CREATE POLICY "Service role can update users"
  ON public.users
  FOR UPDATE
  TO service_role
  USING (true);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.user_exists(TEXT);
DROP FUNCTION IF EXISTS public.create_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.authenticate_user(TEXT, TEXT);

-- Create function to check if a user exists
CREATE FUNCTION public.user_exists(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE users.email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create a user (bypasses RLS)
CREATE FUNCTION public.create_user(
  user_id UUID,
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_full_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    full_name,
    created_at
  ) VALUES (
    user_id,
    user_email,
    user_password,
    user_first_name,
    user_last_name,
    user_full_name,
    now()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating user: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to authenticate a user
CREATE FUNCTION public.authenticate_user(user_email TEXT, user_password_hash TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    users.id,
    users.email,
    users.first_name,
    users.last_name,
    users.full_name
  FROM public.users
  WHERE
    users.email = user_email AND
    users.password_hash = user_password_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
