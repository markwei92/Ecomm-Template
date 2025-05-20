-- Create a function to get table policies
CREATE OR REPLACE FUNCTION get_table_policies(table_name TEXT)
RETURNS TABLE (
  policyname TEXT,
  permissive TEXT,
  roles TEXT[],
  cmd TEXT,
  qual TEXT,
  with_check TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.policyname::TEXT,
    p.permissive::TEXT,
    p.roles::TEXT[],
    p.cmd::TEXT,
    p.qual::TEXT,
    p.with_check::TEXT
  FROM 
    pg_policies p
  WHERE 
    p.tablename = table_name
    AND p.schemaname = 'public';
END;
$$;
