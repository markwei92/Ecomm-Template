-- SQL script to create a function to get user metadata in batch
-- Run this in the Supabase SQL Editor

-- Create a function to get user metadata in batch
CREATE OR REPLACE FUNCTION get_user_metadata_batch(user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(
      (u.raw_user_meta_data->>'first_name')::TEXT,
      (u.raw_user_meta_data->>'firstName')::TEXT,
      ''
    ) AS first_name,
    COALESCE(
      (u.raw_user_meta_data->>'last_name')::TEXT,
      (u.raw_user_meta_data->>'lastName')::TEXT,
      ''
    ) AS last_name
  FROM 
    auth.users u
  WHERE 
    u.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function with a few user IDs
SELECT * FROM get_user_metadata_batch(ARRAY(
  SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 5
));
