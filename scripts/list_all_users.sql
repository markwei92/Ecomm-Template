-- This script lists all users in the auth.users table with their IDs

SELECT 
  id, 
  email,
  created_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data
FROM 
  auth.users
ORDER BY 
  created_at DESC;
