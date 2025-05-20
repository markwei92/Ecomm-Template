-- This script updates a user's password directly in the database
-- This is a more direct approach that might work when other methods fail

DO $$
DECLARE
  user_email TEXT := 'funnyjoketees@gmail.com'; -- Replace with your email
  new_password TEXT := 'NewPassword123!'; -- Replace with your desired new password
  user_id_var UUID;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO user_id_var FROM auth.users WHERE email = user_email;
  
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update the user's password directly
  UPDATE auth.users
  SET 
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
    updated_at = NOW(),
    last_sign_in_at = NOW()
  WHERE id = user_id_var;
  
  RAISE NOTICE 'Password updated directly for user with email %', user_email;
  RAISE NOTICE 'New password is: %', new_password;
END
$$;
