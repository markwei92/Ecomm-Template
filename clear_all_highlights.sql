-- SQL script to clear all user highlights
-- Run this in the Supabase SQL Editor

-- First, check if the user_notifications table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'user_notifications'
  ) THEN
    -- Make sure the highlighted column exists
    ALTER TABLE public.user_notifications
    ADD COLUMN IF NOT EXISTS highlighted BOOLEAN DEFAULT TRUE;
    
    -- Set all notifications to highlighted = false
    UPDATE public.user_notifications
    SET highlighted = FALSE;
    
    RAISE NOTICE 'Set all user notifications to highlighted = FALSE';
  ELSE
    RAISE NOTICE 'user_notifications table does not exist';
  END IF;
END
$$;

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
