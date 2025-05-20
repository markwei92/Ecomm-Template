-- Add is_guest column to stripe_orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'stripe_orders'
        AND column_name = 'is_guest'
    ) THEN
        ALTER TABLE stripe_orders ADD COLUMN is_guest BOOLEAN DEFAULT FALSE;
        
        -- Add comment to the column
        COMMENT ON COLUMN stripe_orders.is_guest IS 'Indicates if the order was placed by a guest user';
    END IF;
END
$$;
