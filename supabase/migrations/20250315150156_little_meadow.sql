/*
  # Add RLS policies for product variants

  1. Security
    - Enable RLS on product_variants table
    - Add policies for authenticated users to:
      - Create new product variants
      - Read all product variants
      - Update their product variants
      - Delete their product variants
*/

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create product variants
CREATE POLICY "Users can create product variants"
  ON product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anyone to read product variants
CREATE POLICY "Anyone can view product variants"
  ON product_variants
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update product variants
CREATE POLICY "Users can update product variants"
  ON product_variants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete product variants
CREATE POLICY "Users can delete product variants"
  ON product_variants
  FOR DELETE
  TO authenticated
  USING (true);