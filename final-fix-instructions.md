# Final Fix for Guest Orders in Admin Dashboard

I've implemented the necessary changes to fix the guest order creation process in the CheckoutPage. Here's what was done:

## 1. Fixed the Shipping Address Format in CheckoutPage.tsx

The key issue was that the shipping address needed to be properly formatted with `line1` instead of `street`. I've updated the code to:

1. Ensure the shipping address uses `line1` instead of `street`
2. Add proper email field to the shipping address
3. Add more robust error handling and logging

## 2. Fixed the Webhook Handler

I've also updated the webhook handler to ensure it uses the correct shipping address format:

1. Added proper conversion from `street` to `line1` if needed
2. Improved the handling of metadata addresses
3. Added more detailed logging

## 3. Deployment Instructions

To apply these changes:

1. First, deploy the updated webhook function:
```bash
cd supabase
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

2. Restart your development server:
```bash
cd ..
npm run dev
```

## 4. Testing

After deploying the changes, test the guest checkout flow:

1. Add items to cart as a guest user
2. Complete checkout
3. Verify that the success page shows the appropriate message
4. Check the admin dashboard to verify that the order appears there with the correct details

## 5. If Issues Persist

If you still don't see guest orders in the admin dashboard, you can create a test order directly in the database:

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

Run this SQL in the Supabase SQL Editor, then refresh the admin dashboard to see if the test order appears.
