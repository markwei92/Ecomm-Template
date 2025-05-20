-- SQL script to reset user count state and force a recalculation
-- Run this in the Supabase SQL Editor

-- First, delete notifications for users that no longer exist
DELETE FROM user_notifications
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Then mark all existing notifications as viewed
UPDATE user_notifications SET viewed = true;

-- Then create new unviewed notifications for the latest users
INSERT INTO user_notifications (user_id, viewed)
SELECT id, false
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_notifications)
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

-- Count total users
SELECT COUNT(*) AS total_users FROM auth.users;

-- Create a function to reset user count state
CREATE OR REPLACE FUNCTION public.reset_user_count_state()
RETURNS void AS $$
BEGIN
  -- Delete notifications for users that no longer exist
  DELETE FROM user_notifications
  WHERE user_id NOT IN (SELECT id FROM auth.users);

  -- Mark all existing notifications as viewed
  UPDATE user_notifications SET viewed = true;

  -- Create new unviewed notifications for the latest users
  INSERT INTO user_notifications (user_id, viewed)
  SELECT id, false
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM user_notifications)
  ORDER BY created_at DESC
  LIMIT 10;

  RAISE NOTICE 'User count state reset. Created notifications for the latest 10 users.';
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT public.reset_user_count_state();
