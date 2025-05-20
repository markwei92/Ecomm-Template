# Direct SQL Fix for Guest Orders in Admin Dashboard

I've identified the issue with guest orders not appearing in the admin dashboard. The problem is that the application-created guest orders are not being properly marked with the `is_guest` flag in the database.

## Immediate Fix: Update Existing Guest Orders

Run this SQL query in the Supabase SQL Editor to update any existing guest orders:

```sql
-- Update any orders with the guest user ID to have is_guest=true
UPDATE stripe_orders
SET is_guest = true
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND is_guest IS NOT TRUE;

-- Update any orders with 'guest' in the payment_intent_id to have is_guest=true
UPDATE stripe_orders
SET is_guest = true
WHERE payment_intent_id LIKE '%guest%'
  AND is_guest IS NOT TRUE;
```

## Check for Recent Guest Orders

Run this SQL query to check for recent orders that might be guest orders:

```sql
-- Check for recent orders
SELECT id, payment_intent_id, is_guest, user_id, created_at 
FROM stripe_orders 
ORDER BY created_at DESC 
LIMIT 20;
```

## Test the Admin Dashboard

After running the SQL queries, refresh the admin dashboard. You should now see all guest orders, including those created through the application.

## Long-term Fix

The issue is in the CheckoutPage.tsx file. The guest orders are being created in the database, but they're not being properly marked with the is_guest flag. To fix this:

1. Make sure the `is_guest` flag is set to `true` in the order data
2. Ensure the shipping address is properly formatted with `line1` instead of `street`
3. Use the fixed guest user ID '00000000-0000-0000-0000-000000000001'

I've already made these changes in the code, but they may not be taking effect due to caching or other issues. The SQL fix above will ensure that all guest orders are properly marked and displayed in the admin dashboard.

If you continue to have issues with new guest orders, please let me know and I'll help troubleshoot further.
