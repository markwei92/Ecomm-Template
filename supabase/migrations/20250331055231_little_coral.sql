/*
  # Disable email confirmation requirement
  
  1. Changes
    - Update auth.users table to mark all users as confirmed by default
    - Add trigger to automatically confirm new users
*/

-- Update existing users to be confirmed
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- Create function to auto-confirm new users
CREATE OR REPLACE FUNCTION auth.handle_auto_confirm() 
RETURNS TRIGGER AS $$
BEGIN
  -- Set email_confirmed_at to current timestamp
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm new users
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.handle_auto_confirm();