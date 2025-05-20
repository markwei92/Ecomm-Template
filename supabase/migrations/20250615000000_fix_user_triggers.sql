/*
  # Fix user creation triggers
  
  1. Changes
    - Combine the handle_new_user and create_user_notification functions
    - Create a single trigger that handles both profile creation and notification
*/

-- Create a combined function to handle both profile creation and notification
CREATE OR REPLACE FUNCTION public.handle_new_user_combined() 
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile for the new user
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
  
  -- Create notification for the new user
  INSERT INTO public.user_notifications (
    user_id,
    viewed,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    FALSE,
    now(),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- Create a single trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_combined();
