-- EMERGENCY RESTORE SCRIPT
-- This script will revert all changes and restore the system to a working state
-- Run this in the Supabase SQL Editor

-- Step 1: Drop all problematic objects
DO $$
BEGIN
  -- Drop triggers
  BEGIN
    DROP TRIGGER IF EXISTS refresh_admin_user_view_auth_users ON auth.users;
    RAISE NOTICE 'Dropped trigger refresh_admin_user_view_auth_users';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping trigger refresh_admin_user_view_auth_users: %', SQLERRM;
  END;
  
  BEGIN
    DROP TRIGGER IF EXISTS refresh_admin_user_view_profiles ON profiles;
    RAISE NOTICE 'Dropped trigger refresh_admin_user_view_profiles';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping trigger refresh_admin_user_view_profiles: %', SQLERRM;
  END;
  
  BEGIN
    DROP TRIGGER IF EXISTS on_user_created ON auth.users;
    RAISE NOTICE 'Dropped trigger on_user_created';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping trigger on_user_created: %', SQLERRM;
  END;
  
  -- Drop functions
  BEGIN
    DROP FUNCTION IF EXISTS refresh_admin_user_view();
    RAISE NOTICE 'Dropped function refresh_admin_user_view';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping function refresh_admin_user_view: %', SQLERRM;
  END;
  
  BEGIN
    DROP FUNCTION IF EXISTS create_user_notification();
    RAISE NOTICE 'Dropped function create_user_notification';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping function create_user_notification: %', SQLERRM;
  END;
  
  BEGIN
    DROP FUNCTION IF EXISTS get_user_metadata(UUID);
    RAISE NOTICE 'Dropped function get_user_metadata';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping function get_user_metadata: %', SQLERRM;
  END;
  
  BEGIN
    DROP FUNCTION IF EXISTS create_notifications_for_latest_users(INTEGER);
    RAISE NOTICE 'Dropped function create_notifications_for_latest_users';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping function create_notifications_for_latest_users: %', SQLERRM;
  END;
  
  -- Drop views
  BEGIN
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS admin_user_view CASCADE';
    RAISE NOTICE 'Dropped materialized view admin_user_view';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping materialized view admin_user_view: %', SQLERRM;
  END;
  
  BEGIN
    EXECUTE 'DROP VIEW IF EXISTS admin_user_view CASCADE';
    RAISE NOTICE 'Dropped view admin_user_view';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping view admin_user_view: %', SQLERRM;
  END;
END
$$;

-- Step 2: Recreate the original admin_user_view
DO $$
BEGIN
  BEGIN
    EXECUTE '
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
    )
    SELECT 
      u.id,
      u.email,
      COALESCE(p.first_name, '''') as first_name,
      COALESCE(p.last_name, '''') as last_name,
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
    ';
    
    RAISE NOTICE 'Created materialized view admin_user_view';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating materialized view admin_user_view: %', SQLERRM;
  END;
  
  -- Create indexes
  BEGIN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS admin_user_view_id_idx ON admin_user_view(id)';
    RAISE NOTICE 'Created index admin_user_view_id_idx';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating index admin_user_view_id_idx: %', SQLERRM;
  END;
  
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS admin_user_view_email_idx ON admin_user_view(email)';
    RAISE NOTICE 'Created index admin_user_view_email_idx';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating index admin_user_view_email_idx: %', SQLERRM;
  END;
  
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS admin_user_view_registered_at_idx ON admin_user_view(registered_at)';
    RAISE NOTICE 'Created index admin_user_view_registered_at_idx';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating index admin_user_view_registered_at_idx: %', SQLERRM;
  END;
  
  -- Grant permissions
  BEGIN
    EXECUTE 'GRANT SELECT ON admin_user_view TO authenticated';
    EXECUTE 'GRANT SELECT ON admin_user_view TO anon';
    RAISE NOTICE 'Granted permissions on admin_user_view';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error granting permissions on admin_user_view: %', SQLERRM;
  END;
END
$$;

-- Step 3: Refresh the view
DO $$
BEGIN
  BEGIN
    EXECUTE 'REFRESH MATERIALIZED VIEW admin_user_view';
    RAISE NOTICE 'Refreshed materialized view admin_user_view';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error refreshing materialized view admin_user_view: %', SQLERRM;
  END;
END
$$;
