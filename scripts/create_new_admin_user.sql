-- This script creates a new admin user with a known password
-- Replace the email and password with your desired values

DO $$
DECLARE
  admin_email TEXT := 'markwei123@yahoo.com'; -- Replace with your desired email
  admin_password TEXT := 'gsUL8Ef95hhq6QRb'; -- Replace with your desired password
  new_user_id UUID;
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
  
  RAISE NOTICE 'Admin user created successfully with email: %', admin_email;
  RAISE NOTICE 'Password is: %', admin_password;
END
$$;
