-- Create product_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_categories_updated_at
BEFORE UPDATE ON product_categories
FOR EACH ROW
EXECUTE FUNCTION update_product_categories_updated_at();

-- Enable Row Level Security
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view product categories"
  ON product_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can manage product categories"
  ON product_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default category
INSERT INTO product_categories (name, slug)
VALUES ('T-Shirts', 't-shirts')
ON CONFLICT (slug) DO NOTHING;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
