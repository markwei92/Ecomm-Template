-- SQL script to force notification badges to appear
-- Run this in the Supabase SQL Editor

-- First, mark all existing notifications as viewed
UPDATE user_notifications SET viewed = true;

-- Then create new unviewed notifications for the latest users
INSERT INTO user_notifications (user_id, viewed)
SELECT id, false
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

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

-- Create a function to force notification badges
CREATE OR REPLACE FUNCTION public.force_notification_badges()
RETURNS void AS $$
BEGIN
  -- Mark all existing notifications as viewed
  UPDATE user_notifications SET viewed = true;
  
  -- Create new unviewed notifications for the latest users
  INSERT INTO user_notifications (user_id, viewed)
  SELECT id, false
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 10;
  
  RAISE NOTICE 'Notification badges forced for the latest 10 users';
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT public.force_notification_badges();
