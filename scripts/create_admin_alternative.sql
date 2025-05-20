-- This script creates a new admin user with a different approach
-- Replace the email and password with your desired values

DO $$
DECLARE
  admin_email TEXT := 'admin2@example.com'; -- Replace with your desired email
  admin_password TEXT := 'Admin2Password123!'; -- Replace with your desired password
  new_user_id UUID;
  instance_id_var UUID;
BEGIN
  -- Get instance_id from an existing user
  SELECT instance_id INTO instance_id_var FROM auth.users LIMIT 1;
  
  IF instance_id_var IS NULL THEN
    RAISE EXCEPTION 'No existing users found to get instance_id';
  END IF;

  -- Check if user with this email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    RAISE EXCEPTION 'User with email % already exists', admin_email;
  END IF;

  -- Generate a new UUID for the user
  new_user_id := extensions.uuid_generate_v4();
  
  -- Insert the user directly into auth.users with minimal fields
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
    extensions.crypt(admin_password, extensions.gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  );

  -- Add the user to admin_users table
  INSERT INTO public.admin_users (user_id)
  VALUES (new_user_id);
  
  RAISE NOTICE 'Admin user created successfully with email: %', admin_email;
  RAISE NOTICE 'Password is: %', admin_password;
END
$$;
