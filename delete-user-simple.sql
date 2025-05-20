-- Simple SQL script to delete a user by email
-- Run this in the Supabase SQL Editor

-- Set the email to delete
DO $$
DECLARE
  user_email TEXT := 'test7@test7.com';
  target_user_id UUID;
BEGIN
  -- Find the user ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  -- Output the user ID if found
  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user with ID: %', target_user_id;
  ELSE
    RAISE NOTICE 'User with email % not found', user_email;
    RETURN;
  END IF;
  
  -- Disable triggers temporarily to avoid constraint issues
  SET session_replication_role = 'replica';
  
  -- Delete directly from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  RAISE NOTICE 'Deleted user from auth.users';
  
  -- Re-enable triggers
  SET session_replication_role = 'origin';
  
  RAISE NOTICE 'User deletion complete';
END $$;
