/*
  # Fix settings table RLS policies
  
  1. Changes
    - Drop existing policies
    - Create new policies for insert and update operations
    - Add proper RLS policies for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated read access to settings" ON settings;
DROP POLICY IF EXISTS "Allow authenticated update access to settings" ON settings;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
  ON settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update existing shipping price or insert if not exists
INSERT INTO settings (key, value)
VALUES (
  'shipping_price',
  jsonb_build_object(
    'base_price', 5.00,
    'additional_item_price', 2.50
  )
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;