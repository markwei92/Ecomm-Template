-- This script resets a user's password
-- Replace the email and new password with your desired values

DO $$
DECLARE
  user_email TEXT := 'funnyjoketees@gmail.com'; -- Replace with your email
  new_password TEXT := 'Ecomdash2025$'; -- Replace with your desired new password
  user_id_var UUID;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO user_id_var FROM auth.users WHERE email = user_email;
  
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update the user's password
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = user_id_var;
  
  RAISE NOTICE 'Password reset successfully for user with email %', user_email;
  RAISE NOTICE 'New password is: %', new_password;
END
$$;
