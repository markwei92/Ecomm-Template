/*
  # Add function to delete users and their data
  
  1. Changes
    - Create a function to handle user deletion
    - Function will delete user and all associated data
    - Set proper permissions
*/

-- Create function to handle user deletion
CREATE OR REPLACE FUNCTION delete_user(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete user's data from all related tables
  -- The ON DELETE CASCADE will handle most relations
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set function ownership and permissions
ALTER FUNCTION delete_user(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION delete_user(uuid) TO authenticated;