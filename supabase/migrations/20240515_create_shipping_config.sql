-- Create the shipping_config table if it doesn't exist
CREATE OR REPLACE FUNCTION create_shipping_config_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS shipping_config (
    id SERIAL PRIMARY KEY,
    base_shipping_cost INTEGER NOT NULL DEFAULT 500,
    additional_item_cost INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
END;
$$;

-- Create the table immediately
SELECT create_shipping_config_table();

-- Insert default values if the table is empty
INSERT INTO shipping_config (base_shipping_cost, additional_item_cost)
SELECT 500, 250
WHERE NOT EXISTS (SELECT 1 FROM shipping_config);

-- Grant access to the table
GRANT ALL ON TABLE shipping_config TO authenticated;
GRANT ALL ON TABLE shipping_config TO service_role;
GRANT ALL ON SEQUENCE shipping_config_id_seq TO authenticated;
GRANT ALL ON SEQUENCE shipping_config_id_seq TO service_role;
