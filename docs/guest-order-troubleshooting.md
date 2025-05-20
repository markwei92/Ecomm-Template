# Guest Order Troubleshooting Guide

This quick reference guide provides solutions for common issues with the guest order system.

## Quick Checklist

- [ ] RLS is enabled on the `stripe_orders` table
- [ ] Guest user ID exists in the auth.users table
- [ ] RLS policies for guest orders are correctly configured
- [ ] Frontend code correctly identifies guest users
- [ ] Frontend code sets `is_guest = true` when creating orders
- [ ] Supabase anon key has the necessary permissions

## Common Error Messages and Solutions

### "new row violates row-level security policy for table 'stripe_orders'"

**Cause**: The RLS policy is preventing the insertion of guest orders.

**Solutions**:

1. Check if the RLS policy for guest orders exists:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'stripe_orders' 
   AND cmd = 'INSERT' 
   AND policyname LIKE '%guest%';
   ```

2. Create or update the policy if needed:
   ```sql
   CREATE POLICY "Allow inserting guest orders" 
   ON stripe_orders 
   FOR INSERT TO public 
   WITH CHECK (is_guest = true);
   ```

3. Verify that `is_guest` is set to `true` in the order data.

### "Foreign key constraint violation"

**Cause**: The guest user ID doesn't exist in the auth.users table.

**Solutions**:

1. Check if the guest user exists:
   ```sql
   SELECT * FROM auth.users 
   WHERE id = '00000000-0000-0000-0000-000000000001';
   ```

2. Create the guest user if needed:
   ```sql
   INSERT INTO auth.users (id, email, created_at, updated_at)
   VALUES ('00000000-0000-0000-0000-000000000001', 'guest@example.com', NOW(), NOW())
   ON CONFLICT (id) DO NOTHING;
   ```

### "Invalid API key"

**Cause**: The Supabase API key is incorrect or has expired.

**Solutions**:

1. Verify the API key in your .env file matches the one in Supabase.
2. Check if the key has expired and generate a new one if needed.
3. Ensure the key has the necessary permissions.

### Guest orders not appearing in admin dashboard

**Cause**: The RLS policy for viewing guest orders is missing or incorrect.

**Solutions**:

1. Check if the RLS policy for viewing guest orders exists:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'stripe_orders' 
   AND cmd = 'SELECT' 
   AND policyname LIKE '%guest%';
   ```

2. Create or update the policy if needed:
   ```sql
   CREATE POLICY "Allow viewing guest orders" 
   ON stripe_orders 
   FOR SELECT TO public 
   USING (is_guest = true);
   ```

3. Verify that the admin RLS policy includes guest orders:
   ```sql
   CREATE POLICY "Admins can view all orders" 
   ON stripe_orders 
   FOR SELECT TO public 
   USING (auth.uid() IN (SELECT user_id FROM admin_users));
   ```

## Diagnostic Queries

### Check RLS Status

```sql
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'stripe_orders';
```

### List All RLS Policies

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'stripe_orders' 
ORDER BY cmd;
```

### Count Guest Orders

```sql
SELECT COUNT(*) FROM stripe_orders WHERE is_guest = true;
```

### Check Guest User

```sql
SELECT * FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

## Testing Guest Order Insertion

Run the following test script to verify guest order functionality:

```javascript
// test-guest-order.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testGuestOrderInsertion() {
  try {
    // Create a test guest order
    const testOrder = {
      payment_intent_id: 'test_guest_' + Date.now(),
      is_guest: true,
      user_id: '00000000-0000-0000-0000-000000000001',
      customer_id: 'cus_guest_test',
      amount_total: 1000,
      currency: 'usd',
      status: 'completed',
      payment_status: 'succeeded',
      items: [{ id: 'test', title: 'Test Product', quantity: 1, price: 1000 }],
      shipping_address: { 
        name: 'Test Guest', 
        line1: '123 Test St', 
        city: 'Testville', 
        state: 'TS',
        postal_code: '12345', 
        country: 'US' 
      },
      shipping_cost: 400,
      created_at: new Date().toISOString()
    };
    
    // Insert the test order
    const { data, error } = await supabase
      .from('stripe_orders')
      .insert(testOrder)
      .select();
    
    if (error) {
      console.error('Error inserting test guest order:', error);
      return;
    }
    
    console.log('Test guest order inserted successfully:', data);
  } catch (err) {
    console.error('Unexpected error during test:', err);
  }
}

// Run the test
testGuestOrderInsertion();
```

## Frontend Code Verification

Ensure your frontend code correctly:

1. Detects guest users:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   const customUser = localStorage.getItem('user');
   const isGuestUser = !session && !customUser;
   ```

2. Sets `is_guest = true` when creating orders:
   ```typescript
   const orderData = {
     // other fields...
     is_guest: true,
     // other fields...
   };
   ```

3. Uses the correct guest user ID:
   ```typescript
   const guestUuid = '00000000-0000-0000-0000-000000000001';
   ```

## Running the Diagnostic Tool

For comprehensive diagnostics, run the diagnostic tool:

```bash
node scripts/guest-order-diagnostic.js
```

This will:
1. Check database connection
2. Verify the guest user exists
3. Check RLS policies
4. Test guest order insertion
5. Generate a detailed log file

## Need More Help?

If you're still experiencing issues after following this guide, check the full documentation in `docs/guest-order-system.md` or run the diagnostic tool for more detailed troubleshooting.
