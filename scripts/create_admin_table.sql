-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'admin',
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to read admin_users
CREATE POLICY admin_users_select_policy ON public.admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Policy to allow service role to manage admin_users
CREATE POLICY admin_users_all_policy ON public.admin_users
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to add a user as admin
CREATE OR REPLACE FUNCTION public.add_admin_user(user_email TEXT)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
  admin_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert into admin_users if not already an admin
  INSERT INTO public.admin_users (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO admin_id;
  
  RETURN admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
