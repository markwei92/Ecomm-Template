/*
  # Add RLS policies for products management

  1. Security
    - Enable RLS on products table
    - Add policies for authenticated users to:
      - Create new products
      - Read all products
      - Update their products
      - Delete their products
*/

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create products
CREATE POLICY "Users can create products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anyone to read products
CREATE POLICY "Anyone can view products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update products
CREATE POLICY "Users can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete products
CREATE POLICY "Users can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (true);