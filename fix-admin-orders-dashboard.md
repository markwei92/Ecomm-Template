# Fix for Admin Orders Dashboard

I've identified and fixed the issues with the admin orders dashboard not loading guest orders. There were two main problems:

1. The Edge Function for fetching Stripe customer information wasn't handling guest customer IDs properly
2. The OrdersList.tsx file was trying to update profiles for guest users, which was causing permission errors

## Changes Made

1. Updated the `get-stripe-customer` Edge Function to:
   - Add comprehensive CORS headers
   - Add special handling for guest customer IDs (returning mock data)

2. Updated the OrdersList.tsx file to:
   - Skip profile updates for guest users
   - Add better error handling to prevent blank screens

## How to Deploy the Fix

### Step 1: Deploy the Updated Edge Function

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

### Step 2: Restart Your Development Server

After deploying the function, restart your development server:
```bash
cd ..
npm run dev
```

## Testing

After deploying the fix, you should be able to:

1. View the admin orders dashboard without errors
2. See guest orders properly displayed with their information
3. Manage guest orders just like regular user orders

If you continue to experience issues, please let me know and we can investigate further.
