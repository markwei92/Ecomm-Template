# Instructions to Deploy the Updated Edge Function

I've made several changes to fix the CORS issues with guest checkout. To deploy these changes, you'll need to:

1. Navigate to the Supabase project directory:
```bash
cd supabase
```

2. Deploy the updated stripe-payment-intent function:
```bash
npx supabase functions deploy stripe-payment-intent --no-verify-jwt
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

## Changes Made

1. Updated CORS headers to be more comprehensive:
   - Added all necessary custom headers to the allowed headers list
   - Added support for all HTTP methods
   - Added max-age and credentials settings

2. Improved the OPTIONS request handler:
   - Now dynamically includes any requested headers
   - Added logging for debugging

3. Modified the client-side code:
   - Now includes guest user information in the request body
   - Added additional logging for debugging

4. Updated the server-side code:
   - Now checks for guest user information in both headers and request body
   - Added more detailed logging

These changes should resolve the CORS issues with guest checkout.
