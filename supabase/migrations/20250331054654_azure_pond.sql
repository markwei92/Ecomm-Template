/*
  # Add logging to user trigger function
  
  1. Changes
    - Drop existing trigger to avoid dependency issues
    - Create updated trigger function with logging
    - Recreate trigger with new function
*/

-- Drop trigger first to avoid dependency issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create updated function with logging
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  _log_data jsonb;
BEGIN
  -- Create log data
  _log_data := jsonb_build_object(
    'user_id', NEW.id,
    'raw_user_meta_data', NEW.raw_user_meta_data,
    'first_name', COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    'last_name', COALESCE(NEW.raw_user_meta_data->>'lastName', '')
  );

  -- Log the data
  RAISE LOG 'handle_new_user() called with data: %', _log_data;

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    now(),
    now()
  );

  -- Log successful profile creation
  RAISE LOG 'Profile created for user: %', NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();