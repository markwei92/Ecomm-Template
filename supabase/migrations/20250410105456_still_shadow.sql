/*
  # Streamline product variants management
  
  1. Changes
    - Add default_sizes array column to product_variants
    - Add trigger to automatically populate sizes
    - Update existing variants to include standard sizes
    - Remove size selection from variant management
*/

-- Add array of default sizes
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS default_sizes text[] DEFAULT ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'];

-- Create function to handle variant sizes
CREATE OR REPLACE FUNCTION handle_variant_sizes()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default sizes based on age group
  IF NEW.age_group = 'adults' THEN
    NEW.default_sizes := ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  ELSIF NEW.age_group = 'kids' THEN
    NEW.default_sizes := ARRAY['XS (Kids)', 'S (Kids)', 'M (Kids)', 'L (Kids)', 'XL (Kids)', '2XL (Kids)'];
  ELSIF NEW.age_group = 'toddlers' THEN
    NEW.default_sizes := ARRAY['2T', '3T', '4T', '5T'];
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;