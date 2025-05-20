# Instructions to Deploy the Updated Webhook Function

I've made several changes to fix the guest checkout issues. To deploy these changes, you'll need to:

1. Navigate to the Supabase project directory:
```bash
cd supabase
```

2. Deploy the updated stripe-webhook function:
```bash
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

3. If you're prompted to log in, use:
```bash
npx supabase login
```

4. After deployment, restart your development server:
```bash
cd ..
npm run dev
```

## Important: Guest User Setup

I've created a special guest user in the database with ID '00000000-0000-0000-0000-000000000001'. This user is used for all guest orders to avoid foreign key constraint issues. The code has been updated to use this fixed guest user ID for all guest orders.

## Changes Made

1. Fixed the guest order handling in the webhook function:
   - Now using valid UUIDs for guest user_id to comply with the database schema
   - Added is_guest flag to properly identify guest orders

2. Updated the admin dashboard to use the is_guest flag:
   - Now properly identifies and displays guest orders
   - Shows appropriate user information for guest orders

3. Updated the checkout success page:
   - Now shows a different message for guest users
   - Properly identifies guest orders using the is_guest flag

These changes should resolve the issues with guest orders not appearing in the admin dashboard and the success page not showing the appropriate message for guest users.

## Testing

After deploying the changes, please test the guest checkout flow again:
1. Add items to cart as a guest user
2. Complete checkout
3. Verify that the success page shows the appropriate message
4. Check the admin dashboard to verify that the order appears there

If you still encounter issues, please let me know and I'll help troubleshoot further.
