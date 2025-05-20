/*
  # Add RLS policies for product images

  1. Security
    - Enable RLS on product_images table
    - Add policies for authenticated users to:
      - Create new product images
      - Read all product images
      - Update their product images
      - Delete their product images
*/

-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create product images
CREATE POLICY "Users can create product images"
  ON product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anyone to read product images
CREATE POLICY "Anyone can view product images"
  ON product_images
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update product images
CREATE POLICY "Users can update product images"
  ON product_images
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete product images
CREATE POLICY "Users can delete product images"
  ON product_images
  FOR DELETE
  TO authenticated
  USING (true);