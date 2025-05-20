-- Simple SQL script to create notifications for existing users
-- Run this in the Supabase SQL Editor

-- First, check if there are any existing notifications
SELECT * FROM user_notifications WHERE viewed = false;

-- Create notifications for all users that don't have one
INSERT INTO user_notifications (user_id, viewed)
SELECT id, false
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_notifications)
ORDER BY created_at DESC
LIMIT 10;

-- Create a function to create notifications for the latest users
CREATE OR REPLACE FUNCTION create_notifications_for_latest_users(limit_count INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  -- Insert notifications for users that don't have one
  WITH inserted AS (
    INSERT INTO user_notifications (user_id, viewed)
    SELECT id, false
    FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM user_notifications)
    ORDER BY created_at DESC
    LIMIT limit_count
    RETURNING id
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;
  
  -- If no new notifications were created, mark existing ones as unviewed
  IF inserted_count = 0 THEN
    WITH updated AS (
      UPDATE user_notifications
      SET viewed = false
      WHERE user_id IN (
        SELECT id
        FROM auth.users
        ORDER BY created_at DESC
        LIMIT limit_count
      )
      RETURNING id
    )
    SELECT COUNT(*) INTO inserted_count FROM updated;
  END IF;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Call the function to create notifications for the latest 10 users
SELECT create_notifications_for_latest_users(10);
