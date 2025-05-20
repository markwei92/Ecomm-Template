/*
  # Add function to get latest order by session ID
  
  1. Changes
    - Create a function to fetch the latest order for a user
    - Filter by session ID if provided
    - Return order details
*/

CREATE OR REPLACE FUNCTION get_latest_order(user_id uuid, stripe_session_id text DEFAULT NULL)
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
  JOIN stripe_customers c ON o.customer_id = c.customer_id
  WHERE c.user_id = get_latest_order.user_id
  AND (stripe_session_id IS NULL OR o.checkout_session_id = stripe_session_id)
  AND o.deleted_at IS NULL
  ORDER BY o.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_latest_order(uuid, text) TO authenticated;