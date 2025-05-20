/*
  # Create admin user view and add profile fields
  
  1. New Columns
    - Add date_of_birth and gender to profiles table
    
  2. Views
    - Create admin_user_view for user management dashboard
    - Include user details, profile info, default address, and cart summary
    
  3. Security
    - Grant appropriate permissions for the view
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Create a materialized view for better performance
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_user_view AS
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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS admin_user_view_email_idx ON admin_user_view(email);
CREATE INDEX IF NOT EXISTS admin_user_view_registered_at_idx ON admin_user_view(registered_at);
CREATE INDEX IF NOT EXISTS admin_user_view_cart_value_idx ON admin_user_view(cart_value);

-- Grant permissions
GRANT SELECT ON admin_user_view TO authenticated;

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_admin_user_view()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_user_view;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh the view when relevant tables change
DROP TRIGGER IF EXISTS refresh_admin_user_view_profiles ON profiles;
CREATE TRIGGER refresh_admin_user_view_profiles
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_user_view();

DROP TRIGGER IF EXISTS refresh_admin_user_view_addresses ON addresses;
CREATE TRIGGER refresh_admin_user_view_addresses
AFTER INSERT OR UPDATE OR DELETE ON addresses
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_user_view();

DROP TRIGGER IF EXISTS refresh_admin_user_view_cart_items ON cart_items;
CREATE TRIGGER refresh_admin_user_view_cart_items
AFTER INSERT OR UPDATE OR DELETE ON cart_items
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_user_view();