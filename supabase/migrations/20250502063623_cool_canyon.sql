/*
  # Add shipping and coupon management tables

  1. New Tables
    - `settings`
      - `id` (uuid, primary key)
      - `key` (text)
      - `value` (jsonb)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

    - `coupons`
      - `id` (uuid, primary key)
      - `stripe_id` (text)
      - `code` (text)
      - `type` (text)
      - `amount` (numeric)
      - `valid_from` (timestamp with time zone)
      - `expires_at` (timestamp with time zone)
      - `usage_limit` (integer)
      - `times_used` (integer)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create settings table
CREATE TABLE settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create coupons table
CREATE TABLE coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_id text UNIQUE NOT NULL,
    code text UNIQUE NOT NULL,
    type text NOT NULL CHECK (type IN ('percentage', 'fixed_amount')),
    amount numeric NOT NULL,
    valid_from timestamptz NOT NULL,
    expires_at timestamptz,
    usage_limit integer,
    times_used integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
CREATE POLICY "Allow authenticated read access to settings"
    ON settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated update access to settings"
    ON settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policies for coupons
CREATE POLICY "Allow authenticated read access to coupons"
    ON coupons FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert access to coupons"
    ON coupons FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to coupons"
    ON coupons FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete access to coupons"
    ON coupons FOR DELETE
    TO authenticated
    USING (true);

-- Create indexes
CREATE INDEX settings_key_idx ON settings(key);
CREATE INDEX coupons_code_idx ON coupons(code);
CREATE INDEX coupons_valid_from_idx ON coupons(valid_from);
CREATE INDEX coupons_expires_at_idx ON coupons(expires_at);

-- Create trigger for updated_at
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default shipping price
INSERT INTO settings (key, value)
VALUES ('shipping_price', '{"amount": 5.00}'::jsonb)
ON CONFLICT (key) DO NOTHING;