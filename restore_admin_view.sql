-- SQL script to restore the original admin_user_view
-- Run this in the Supabase SQL Editor

-- First, drop any existing view or materialized view
DO $$
BEGIN
  -- Try to drop as a regular view first
  BEGIN
    EXECUTE 'DROP VIEW IF EXISTS admin_user_view CASCADE';
    RAISE NOTICE 'Dropped view admin_user_view';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping view: %', SQLERRM;
  END;

  -- Then try to drop as a materialized view
  BEGIN
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS admin_user_view CASCADE';
    RAISE NOTICE 'Dropped materialized view admin_user_view';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping materialized view: %', SQLERRM;
  END;
END
$$;

-- Create the original admin_user_view
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
  COALESCE(p.first_name, '') as first_name,
  COALESCE(p.last_name, '') as last_name,
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
  cart_summary c ON u.id = c.user_id;

-- Create indexes for better performance
CREATE UNIQUE INDEX admin_user_view_id_idx ON admin_user_view(id);
CREATE INDEX admin_user_view_email_idx ON admin_user_view(email);
CREATE INDEX admin_user_view_registered_at_idx ON admin_user_view(registered_at);

-- Grant permissions
GRANT SELECT ON admin_user_view TO authenticated;
GRANT SELECT ON admin_user_view TO anon;

-- Refresh the view
REFRESH MATERIALIZED VIEW admin_user_view;
