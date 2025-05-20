/*
  # Update get_latest_order function to handle session ID
  
  1. Changes
    - Add session_id parameter to get_latest_order function
    - Update function to filter by checkout_session_id when provided
*/

CREATE OR REPLACE FUNCTION get_latest_order(
  session_id text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  amount_total bigint,
  created_at timestamptz,
  currency text,
  payment_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.amount_total,
    o.created_at,
    o.currency,
    o.payment_status
  FROM stripe_orders o
  WHERE (session_id IS NULL OR o.checkout_session_id = session_id)
  AND o.deleted_at IS NULL
  ORDER BY o.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_latest_order(text) TO authenticated;