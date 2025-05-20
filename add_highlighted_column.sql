-- SQL script to add highlighted column to user_notifications table
-- Run this in the Supabase SQL Editor

-- First, check if the user_notifications table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_notifications'
  ) THEN
    -- Add highlighted column if it doesn't exist
    ALTER TABLE public.user_notifications
    ADD COLUMN IF NOT EXISTS highlighted BOOLEAN DEFAULT TRUE;

    -- Set initial values: all unviewed notifications should be highlighted
    UPDATE public.user_notifications
    SET highlighted = TRUE
    WHERE viewed = FALSE;

    -- Set highlighted = FALSE for viewed notifications
    UPDATE public.user_notifications
    SET highlighted = FALSE
    WHERE viewed = TRUE;

    RAISE NOTICE 'Added highlighted column to user_notifications table';
  ELSE
    RAISE NOTICE 'user_notifications table does not exist';
  END IF;
END
$$;

-- Create a function to toggle the highlighted state of a user notification
CREATE OR REPLACE FUNCTION toggle_user_highlighted(user_id_param UUID, highlighted_param BOOLEAN)
RETURNS void AS $$
BEGIN
  UPDATE public.user_notifications
  SET highlighted = highlighted_param
  WHERE user_id = user_id_param;

  RAISE NOTICE 'Updated highlighted state for user % to %', user_id_param, highlighted_param;
END;
$$ LANGUAGE plpgsql;

-- Update the create_notifications_for_latest_users function to use highlighted
CREATE OR REPLACE FUNCTION create_notifications_for_latest_users(limit_count INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  -- Insert notifications for users that don't have one
  INSERT INTO user_notifications (user_id, viewed, highlighted)
  SELECT id, false, true
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM user_notifications)
  ORDER BY created_at DESC
  LIMIT limit_count;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- If no new notifications were created, mark existing ones as highlighted
  IF inserted_count = 0 THEN
    UPDATE user_notifications
    SET highlighted = true
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

-- Create a function to get the count of highlighted users
CREATE OR REPLACE FUNCTION get_highlighted_users_count()
RETURNS INTEGER AS $$
DECLARE
  highlighted_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO highlighted_count
  FROM public.user_notifications
  WHERE highlighted = TRUE;

  RETURN highlighted_count;
END;
$$ LANGUAGE plpgsql;

-- Check the results
SELECT
  n.id,
  n.user_id,
  n.viewed,
  n.highlighted,
  n.created_at,
  u.email
FROM
  user_notifications n
JOIN
  auth.users u ON n.user_id = u.id
ORDER BY
  n.created_at DESC;
