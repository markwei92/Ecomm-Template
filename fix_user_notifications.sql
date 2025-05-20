-- SQL script to fix user notifications
-- Run this in the Supabase SQL Editor

-- First, check if there are any existing notifications for the new users
SELECT * FROM user_notifications WHERE viewed = false;

-- Create notifications for all users that don't have one
INSERT INTO user_notifications (user_id, viewed)
SELECT id, false
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_notifications)
AND email IN ('test7@test7.com', 'test6@test6.com', 'test5@test5.com');

-- Fix the trigger function to ensure it works for new signups
CREATE OR REPLACE FUNCTION create_user_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the new user creation
  RAISE NOTICE 'Creating notification for new user: %', NEW.id;

  -- Check if a notification already exists for this user
  IF NOT EXISTS (SELECT 1 FROM user_notifications WHERE user_id = NEW.id) THEN
    -- Insert notification
    INSERT INTO user_notifications (user_id, viewed)
    VALUES (NEW.id, false);
    RAISE NOTICE 'Created notification for user: %', NEW.id;
  ELSE
    RAISE NOTICE 'Notification already exists for user: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- Create the trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_user_created'::text
  ) THEN
    CREATE TRIGGER on_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_notification();
    RAISE NOTICE 'Created trigger on_user_created';
  ELSE
    RAISE NOTICE 'Trigger on_user_created already exists';
  END IF;
END
$$;

-- Create a function to extract user metadata
CREATE OR REPLACE FUNCTION get_user_metadata(user_id UUID)
RETURNS TABLE (
  first_name TEXT,
  last_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      (SELECT (raw_user_meta_data->>'first_name')::TEXT FROM auth.users WHERE id = user_id),
      (SELECT (raw_user_meta_data->>'firstName')::TEXT FROM auth.users WHERE id = user_id),
      ''
    ) AS first_name,
    COALESCE(
      (SELECT (raw_user_meta_data->>'last_name')::TEXT FROM auth.users WHERE id = user_id),
      (SELECT (raw_user_meta_data->>'lastName')::TEXT FROM auth.users WHERE id = user_id),
      ''
    ) AS last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the admin_user_view to include metadata from auth.users
DO $$
BEGIN
  -- Drop the view if it exists
  DROP MATERIALIZED VIEW IF EXISTS admin_user_view CASCADE;
  RAISE NOTICE 'Dropped existing admin_user_view';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping admin_user_view: %', SQLERRM;
END
$$;

-- Create the materialized view
CREATE MATERIALIZED VIEW admin_user_view AS
WITH cart_summary AS (
  SELECT
    user_id,
    COUNT(*) as cart_items_count,
    SUM(quantity) as total_items,
    COALESCE(SUM(quantity * products.price), 0) as cart_value
  FROM cart_items
  JOIN products ON cart_items.product_id = products.id
  GROUP BY user_id
),
default_address AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    street as default_street,
    city as default_city,
    state as default_state,
    country as default_country,
    postal_code as default_postal_code
  FROM user_addresses
  WHERE is_default = true
),
user_metadata AS (
  SELECT
    id as user_id,
    COALESCE(
      (raw_user_meta_data->>'first_name')::TEXT,
      (raw_user_meta_data->>'firstName')::TEXT,
      ''
    ) AS meta_first_name,
    COALESCE(
      (raw_user_meta_data->>'last_name')::TEXT,
      (raw_user_meta_data->>'lastName')::TEXT,
      ''
    ) AS meta_last_name
  FROM auth.users
)
SELECT
  u.id,
  u.email,
  COALESCE(p.first_name, um.meta_first_name, '') as first_name,
  COALESCE(p.last_name, um.meta_last_name, '') as last_name,
  p.phone,
  p.date_of_birth,
  p.gender,
  a.default_street,
  a.default_city,
  a.default_state,
  a.default_country,
  a.default_postal_code,
  COALESCE(c.cart_items_count, 0) as cart_items_count,
  COALESCE(c.total_items, 0) as total_items_in_cart,
  COALESCE(c.cart_value, 0) as cart_value,
  u.created_at as registered_at
FROM
  auth.users u
LEFT JOIN
  profiles p ON u.id = p.id
LEFT JOIN
  default_address a ON u.id = a.user_id
LEFT JOIN
  cart_summary c ON u.id = c.user_id
LEFT JOIN
  user_metadata um ON u.id = um.user_id;

-- Create indexes for better performance
CREATE UNIQUE INDEX admin_user_view_id_idx ON admin_user_view(id);
CREATE INDEX admin_user_view_email_idx ON admin_user_view(email);
CREATE INDEX admin_user_view_registered_at_idx ON admin_user_view(registered_at);

-- Set ownership and permissions
ALTER MATERIALIZED VIEW admin_user_view OWNER TO postgres;
GRANT SELECT ON admin_user_view TO authenticated;
GRANT SELECT ON admin_user_view TO anon;

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_admin_user_view()
RETURNS trigger AS $$
BEGIN
  -- Check if refresh is already running
  IF EXISTS (
    SELECT 1 FROM pg_stat_activity
    WHERE query LIKE 'REFRESH MATERIALIZED VIEW%admin_user_view%'
    AND pid != pg_backend_pid()
  ) THEN
    RETURN NULL;
  END IF;

  -- Refresh the view
  REFRESH MATERIALIZED VIEW admin_user_view;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set function ownership
ALTER FUNCTION refresh_admin_user_view() OWNER TO postgres;

-- Create triggers for automatic refresh (only if they don't exist)
DO $$
BEGIN
  -- Check if the auth.users trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'refresh_admin_user_view_auth_users'::text
  ) THEN
    CREATE TRIGGER refresh_admin_user_view_auth_users
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_admin_user_view();
    RAISE NOTICE 'Created trigger refresh_admin_user_view_auth_users';
  ELSE
    RAISE NOTICE 'Trigger refresh_admin_user_view_auth_users already exists';
  END IF;

  -- Check if the profiles trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'refresh_admin_user_view_profiles'::text
  ) THEN
    CREATE TRIGGER refresh_admin_user_view_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_admin_user_view();
    RAISE NOTICE 'Created trigger refresh_admin_user_view_profiles';
  ELSE
    RAISE NOTICE 'Trigger refresh_admin_user_view_profiles already exists';
  END IF;
END
$$;

-- Refresh the view immediately
REFRESH MATERIALIZED VIEW admin_user_view;

-- Create a function to get the latest users
CREATE OR REPLACE FUNCTION get_latest_users(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email,
    au.created_at
  FROM
    auth.users au
  ORDER BY
    au.created_at DESC
  LIMIT
    limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notifications for recent users that don't have one
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
