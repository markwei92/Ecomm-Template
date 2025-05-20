-- Create or replace the get_latest_users function
CREATE OR REPLACE FUNCTION get_latest_users(limit_count integer)
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_latest_users(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_users(integer) TO anon;
