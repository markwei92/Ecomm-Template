-- SQL script to create a function for creating notifications for the latest users
-- Run this in the Supabase SQL Editor

-- Create a function to create notifications for the latest users
CREATE OR REPLACE FUNCTION create_notifications_for_latest_users(limit_count INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  -- Insert notifications for users that don't have one
  INSERT INTO user_notifications (user_id, viewed)
  SELECT id, false
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM user_notifications)
  ORDER BY created_at DESC
  LIMIT limit_count;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  -- If no new notifications were created, mark existing ones as unviewed
  IF inserted_count = 0 THEN
    UPDATE user_notifications
    SET viewed = false
    WHERE user_id IN (
      SELECT id
      FROM auth.users
      ORDER BY created_at DESC
      LIMIT limit_count
    );
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
  END IF;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT create_notifications_for_latest_users(10);
