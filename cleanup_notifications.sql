-- SQL script to clean up notifications
-- Run this in the Supabase SQL Editor

-- First, delete notifications for users that no longer exist
DELETE FROM user_notifications
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Check if there are any notifications left
SELECT COUNT(*) FROM user_notifications;

-- Mark all existing notifications as viewed
UPDATE user_notifications SET viewed = false;

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
ORDER BY 
  n.created_at DESC;
