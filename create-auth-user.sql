-- Create a new user in auth.users
-- This is a direct SQL approach to creating a user in the auth.users table

-- Create a function to create a user in auth.users
CREATE OR REPLACE FUNCTION create_auth_user(
  user_email TEXT,
  user_password TEXT,
  user_data JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
  new_user JSONB;
  result JSONB;
BEGIN
  -- Insert the user into auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    last_sign_in_at
  )
  VALUES (
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    user_data,
    now(),
    now(),
    now()
  )
  RETURNING id, email, created_at INTO new_user;
  
  result := json_build_object(
    'success', true,
    'message', 'User created successfully',
    'user', new_user
  );
  
  RETURN result;
EXCEPTION
  WHEN others THEN
    result := json_build_object(
      'success', false,
      'message', SQLERRM,
      'error', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
