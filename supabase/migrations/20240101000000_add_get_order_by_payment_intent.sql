-- Create a function to get an order by payment intent ID
CREATE OR REPLACE FUNCTION get_order_by_payment_intent(payment_intent_id TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  amount_total INTEGER,
  currency TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.user_id,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.created_at
  FROM 
    stripe_orders o
  WHERE 
    o.payment_intent_id = payment_intent_id
  ORDER BY 
    o.created_at DESC
  LIMIT 1;
END;
$$;
