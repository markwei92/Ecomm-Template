-- SQL script to manually mark the latest users as unviewed
-- Run this in the Supabase SQL Editor

-- First, check if there are any existing notifications
SELECT * FROM user_notifications WHERE viewed = false;

-- Mark all existing notifications as viewed
UPDATE user_notifications SET viewed = true;

-- Mark the latest users as unviewed
UPDATE user_notifications
SET viewed = false
WHERE user_id IN (
  SELECT id
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 10
);

-- Check the results
SELECT 
  n.id, 
  n.user_id, 
  n.viewed, 
  n.created_at,
  u.email
FROM 
  user_notifications n
JOIN 
  auth.users u ON n.user_id = u.id
WHERE 
  n.viewed = false
ORDER BY 
  n.created_at DESC;
