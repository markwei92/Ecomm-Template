-- SQL script to fix user notifications without modifying database structures
-- Run this in the Supabase SQL Editor

-- First, check if the user_notifications table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'user_notifications'
  ) THEN
    -- Create the user_notifications table
    CREATE TABLE public.user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      viewed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for admin access
    CREATE POLICY "Admins can manage user_notifications"
      ON user_notifications
      USING (auth.uid() IN (SELECT user_id FROM admin_users));
      
    RAISE NOTICE 'Created user_notifications table';
  ELSE
    RAISE NOTICE 'user_notifications table already exists';
  END IF;
END
$$;

-- Mark all existing notifications as viewed to start fresh
UPDATE user_notifications SET viewed = true;

-- Create notifications for the latest users (mark as unviewed)
INSERT INTO user_notifications (user_id, viewed)
SELECT id, false
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_notifications)
ORDER BY created_at DESC
LIMIT 10;

-- For users that already have notifications, mark the most recent ones as unviewed
UPDATE user_notifications
SET viewed = false
WHERE user_id IN (
  SELECT id
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 10
)
AND id NOT IN (
  SELECT id
  FROM user_notifications
  WHERE viewed = false
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
