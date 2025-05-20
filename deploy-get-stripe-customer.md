# Instructions to Deploy the Updated get-stripe-customer Edge Function

I've updated the `get-stripe-customer` Edge Function to fix the issues that were preventing the admin dashboard from loading guest orders. The changes include:

1. Added comprehensive CORS headers that match other Edge Functions
2. Properly applied CORS headers to OPTIONS preflight requests
3. Expanded the allowed headers to include all custom headers used in the application
4. Added special handling for guest customer IDs (those starting with 'cus_guest_')
   - Now returns a mock customer object for guest users instead of trying to fetch from Stripe

## Deployment Steps

1. Navigate to the Supabase project directory:
```bash
cd supabase
```

2. Deploy the updated get-stripe-customer function:
```bash
npx supabase functions deploy get-stripe-customer --no-verify-jwt
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

## Testing

After deploying the function, you should be able to:

1. View the admin orders dashboard without CORS errors
2. See guest orders properly displayed with their information
3. Manage guest orders just like regular user orders

If you continue to experience issues, please let me know and we can investigate further.
