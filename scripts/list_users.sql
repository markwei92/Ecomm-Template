-- This script lists all users in the auth.users table
-- Run this to find your user ID

SELECT 
  id, 
  email, 
  CASE 
    WHEN raw_app_meta_data->>'provider' IS NOT NULL THEN raw_app_meta_data->>'provider'
    ELSE 'email'
  END as provider,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;
