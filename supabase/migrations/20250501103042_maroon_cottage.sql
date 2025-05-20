/*
  # Create Stripe tables and policies

  1. New Tables
    - `stripe_products`
      - `id` (uuid, primary key)
      - `stripe_id` (text)
      - `name` (text)
      - `description` (text)
      - `active` (boolean)
      - `metadata` (jsonb)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

    - `stripe_prices`
      - `id` (uuid, primary key)
      - `stripe_id` (text)
      - `product_id` (uuid, references stripe_products)
      - `active` (boolean)
      - `currency` (text)
      - `type` (text)
      - `unit_amount` (bigint)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS
    - Add policies for public access to active products and prices
*/

-- Create stripe_products table
CREATE TABLE stripe_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_id text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create stripe_prices table
CREATE TABLE stripe_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_id text UNIQUE NOT NULL,
    product_id uuid REFERENCES stripe_products(id) ON DELETE CASCADE,
    active boolean DEFAULT true,
    currency text NOT NULL,
    type text NOT NULL CHECK (type IN ('one_time', 'recurring')),
    unit_amount bigint NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for stripe_products
CREATE POLICY "Allow public read access to active products"
    ON stripe_products
    FOR SELECT
    TO public
    USING (active = true);

-- Create policies for stripe_prices
CREATE POLICY "Allow public read access to active prices"
    ON stripe_prices
    FOR SELECT
    TO public
    USING (active = true);

-- Create indexes
CREATE INDEX stripe_products_active_idx ON stripe_products(active);
CREATE INDEX stripe_prices_active_idx ON stripe_prices(active);
CREATE INDEX stripe_prices_product_id_idx ON stripe_prices(product_id);

-- Create trigger for updated_at on stripe_products
CREATE TRIGGER update_stripe_products_updated_at
    BEFORE UPDATE ON stripe_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on stripe_prices
CREATE TRIGGER update_stripe_prices_updated_at
    BEFORE UPDATE ON stripe_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();