-- This script checks if a user is in the admin_users table
-- Replace the user_id with your actual user ID

SELECT 
  a.id as admin_id,
  a.user_id,
  u.email,
  a.role,
  a.created_at
FROM 
  public.admin_users a
JOIN 
  auth.users u ON a.user_id = u.id
WHERE 
  u.email = 'funnyjoketees@gmail.com'; -- REPLACE WITH YOUR EMAIL
