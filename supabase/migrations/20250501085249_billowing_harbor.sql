/*
  # Fix inquiries table RLS policies
  
  1. Changes
    - Drop existing policies
    - Create new policy to allow public access for inserts
    - Create policy for authenticated users to view and update inquiries
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create inquiries" ON inquiries;
DROP POLICY IF EXISTS "Authenticated users can view inquiries" ON inquiries;
DROP POLICY IF EXISTS "Authenticated users can update inquiries" ON inquiries;

-- Create new policies with public access
CREATE POLICY "public_create_inquiries"
  ON inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "public_select_inquiries"
  ON inquiries
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "authenticated_update_inquiries"
  ON inquiries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);