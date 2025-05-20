/*
  # Update RLS policies for public access

  1. Changes
    - Drop existing policies
    - Create new policies with unique names to allow public access
    - Enable public access for all operations on products, product_images, and product_variants tables
*/

-- Products table policies
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Users can create products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for all users" ON products;
DROP POLICY IF EXISTS "Enable update for all users" ON products;
DROP POLICY IF EXISTS "Enable delete for all users" ON products;

CREATE POLICY "products_public_read"
  ON products
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "products_public_insert"
  ON products
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "products_public_update"
  ON products
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_public_delete"
  ON products
  FOR DELETE
  TO public
  USING (true);

-- Product Images table policies
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
DROP POLICY IF EXISTS "Users can create product images" ON product_images;
DROP POLICY IF EXISTS "Users can update product images" ON product_images;
DROP POLICY IF EXISTS "Users can delete product images" ON product_images;
DROP POLICY IF EXISTS "Enable read access for all users" ON product_images;
DROP POLICY IF EXISTS "Enable insert for all users" ON product_images;
DROP POLICY IF EXISTS "Enable update for all users" ON product_images;
DROP POLICY IF EXISTS "Enable delete for all users" ON product_images;

CREATE POLICY "product_images_public_read"
  ON product_images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "product_images_public_insert"
  ON product_images
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "product_images_public_update"
  ON product_images
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "product_images_public_delete"
  ON product_images
  FOR DELETE
  TO public
  USING (true);

-- Product Variants table policies
DROP POLICY IF EXISTS "Anyone can view product variants" ON product_variants;
DROP POLICY IF EXISTS "Users can create product variants" ON product_variants;
DROP POLICY IF EXISTS "Users can update product variants" ON product_variants;
DROP POLICY IF EXISTS "Users can delete product variants" ON product_variants;
DROP POLICY IF EXISTS "Enable read access for all users" ON product_variants;
DROP POLICY IF EXISTS "Enable insert for all users" ON product_variants;
DROP POLICY IF EXISTS "Enable update for all users" ON product_variants;
DROP POLICY IF EXISTS "Enable delete for all users" ON product_variants;

CREATE POLICY "product_variants_public_read"
  ON product_variants
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "product_variants_public_insert"
  ON product_variants
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "product_variants_public_update"
  ON product_variants
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "product_variants_public_delete"
  ON product_variants
  FOR DELETE
  TO public
  USING (true);