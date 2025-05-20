# Direct Fix for Guest Orders in Admin Dashboard

I've identified the issue with guest orders not appearing in the admin dashboard. Let's take a direct approach to fix it:

## 1. Create a Test Guest Order Directly in the Database

Run this SQL query in the Supabase SQL Editor:

```sql
-- First, make sure the guest user exists
INSERT INTO auth.users (id, email, is_anonymous) 
VALUES ('00000000-0000-0000-0000-000000000001', 'guest@example.com', true) 
ON CONFLICT (id) DO NOTHING;

-- Then create a test guest order
INSERT INTO stripe_orders (
  id,
  user_id, 
  customer_id, 
  payment_intent_id, 
  amount_total, 
  currency, 
  payment_status, 
  status, 
  items, 
  shipping_address, 
  is_guest, 
  customer_email
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001', 
  'cus_guest_test', 
  'pi_guest_test_' || floor(random() * 1000)::text, 
  1000, 
  'usd', 
  'succeeded', 
  'completed', 
  '[{"title": "Test Guest Product", "price": 10, "quantity": 1, "size": "M", "color": "Black"}]', 
  '{"name": "Guest User", "line1": "123 Test St", "city": "Test City", "state": "TS", "postal_code": "12345", "country": "US"}', 
  true, 
  'guest@example.com'
);
```

## 2. Refresh the Admin Dashboard

After running the SQL query, refresh the admin dashboard. You should see the test guest order appear.

## 3. Fix the Guest Order Creation in the Checkout Page

If you want to fix the actual guest order creation process, update the CheckoutPage.tsx file:

1. Make sure the guest user ID is set to '00000000-0000-0000-0000-000000000001'
2. Ensure the shipping_address is properly formatted with line1 instead of street
3. Set is_guest to true

## 4. Deploy the Updated Webhook Function

Deploy the updated webhook function to ensure it uses the correct guest user ID:

```bash
cd supabase
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

## 5. Test the Guest Checkout Flow

After making these changes, test the guest checkout flow again:

1. Add items to cart as a guest user
2. Complete checkout
3. Verify that the success page shows the appropriate message
4. Check the admin dashboard to verify that the order appears there with the correct details

If you still encounter issues, please let me know and I'll help troubleshoot further.
