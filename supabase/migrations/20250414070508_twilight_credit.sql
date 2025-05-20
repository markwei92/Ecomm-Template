/*
  # Fix admin view permissions and ownership

  1. Changes
    - Drop existing materialized view and related objects
    - Recreate view with proper ownership and permissions
    - Add security definer to refresh function
    - Fix concurrent refresh issues
*/

-- Drop existing view and related objects
DROP MATERIALIZED VIEW IF EXISTS admin_user_view CASCADE;
DROP FUNCTION IF EXISTS refresh_admin_user_view CASCADE;

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
    country as default_country,
    postal_code as default_postal_code
  FROM addresses
  WHERE is_default = true
)
SELECT 
  u.id,
  u.email,
  u.created_at as registered_at,
  p.first_name,
  p.last_name,
  p.phone,
  p.date_of_birth,
  p.gender,
  da.default_country,
  da.default_postal_code,
  COALESCE(cs.cart_items_count, 0) as cart_items_count,
  COALESCE(cs.total_items, 0) as total_items_in_cart,
  COALESCE(cs.cart_value, 0) as cart_value
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN default_address da ON u.id = da.user_id
LEFT JOIN cart_summary cs ON u.id = cs.user_id;

-- Create indexes
CREATE UNIQUE INDEX admin_user_view_id_idx ON admin_user_view(id);
CREATE INDEX admin_user_view_email_idx ON admin_user_view(email);
CREATE INDEX admin_user_view_registered_at_idx ON admin_user_view(registered_at);
CREATE INDEX admin_user_view_cart_value_idx ON admin_user_view(cart_value);

-- Set ownership to postgres (superuser) and grant access
ALTER MATERIALIZED VIEW admin_user_view OWNER TO postgres;
GRANT SELECT ON admin_user_view TO authenticated;
GRANT SELECT ON admin_user_view TO anon;

-- Create improved refresh function with proper permissions
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

-- Create triggers
CREATE TRIGGER refresh_admin_user_view_profiles
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_user_view();

CREATE TRIGGER refresh_admin_user_view_addresses
AFTER INSERT OR UPDATE OR DELETE ON addresses
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_user_view();

CREATE TRIGGER refresh_admin_user_view_cart_items
AFTER INSERT OR UPDATE OR DELETE ON cart_items
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_user_view();