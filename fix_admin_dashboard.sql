-- SQL script to fix admin dashboard access issues
-- Run this in the Supabase SQL Editor

-- First, drop problematic objects
DO $$
BEGIN
  -- Drop triggers that might be causing issues
  DROP TRIGGER IF EXISTS refresh_admin_user_view_auth_users ON auth.users;
  DROP TRIGGER IF EXISTS refresh_admin_user_view_profiles ON profiles;
  
  -- Drop the materialized view
  DROP MATERIALIZED VIEW IF EXISTS admin_user_view CASCADE;
  
  -- Drop functions that might be causing issues
  DROP FUNCTION IF EXISTS refresh_admin_user_view();
  
  RAISE NOTICE 'Dropped potentially problematic objects';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping objects: %', SQLERRM;
END
$$;

-- Create a simpler version of the admin_user_view
CREATE VIEW admin_user_view AS
SELECT 
  u.id,
  u.email,
  COALESCE(p.first_name, '') as first_name,
  COALESCE(p.last_name, '') as last_name,
  p.phone,
  NULL as date_of_birth,
  NULL as gender,
  NULL as default_street,
  NULL as default_city,
  NULL as default_state,
  NULL as default_country,
  NULL as default_postal_code,
  0 as cart_items_count,
  0 as total_items_in_cart,
  0 as cart_value,
  u.created_at as registered_at
FROM 
  auth.users u
LEFT JOIN 
  profiles p ON u.id = p.id;

-- Grant permissions
GRANT SELECT ON admin_user_view TO authenticated;
GRANT SELECT ON admin_user_view TO anon;

-- Create a simple function to create notifications for the latest users
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

-- Create notifications for recent users
SELECT create_notifications_for_latest_users(10);

-- Check if we can access auth.users
SELECT COUNT(*) FROM auth.users;

-- Check if we can access profiles
SELECT COUNT(*) FROM profiles;

-- Check if we can access user_notifications
SELECT COUNT(*) FROM user_notifications;

-- Check if the admin_user_view works
SELECT COUNT(*) FROM admin_user_view;
