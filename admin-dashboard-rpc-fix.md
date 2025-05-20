# Admin Dashboard RPC Function Fix

I've fixed the issues with the admin dashboard by removing problematic RPC function calls that were causing 400 errors. The main issue was that the `execute_sql` RPC function was either not available or not properly configured in your Supabase project.

## Changes Made

1. Removed all calls to the `execute_sql` RPC function that were causing 400 errors
2. Replaced the `mark_mailing_list_viewed` RPC function with a direct database update
3. Added better error handling throughout the code

## How to Deploy the Fix

The code changes have already been applied to your local files. Simply restart your development server:

```bash
npm run dev
```

## Testing

After deploying the fix, you should be able to:

1. View the admin dashboard without 400 errors
2. See orders, including guest orders, properly displayed
3. Manage orders just like before

## Understanding the Issue

The error was occurring because the code was trying to call RPC functions that either:
1. Don't exist in your Supabase project
2. Don't have the right permissions
3. Were configured incorrectly

## Future Improvements

If you want to use these RPC functions in the future, you'll need to:

1. Create the `execute_sql` function in your Supabase project
2. Create the `mark_mailing_list_viewed` function in your Supabase project
3. Ensure the functions have the right permissions

For now, the application will work without these functions by using direct database operations instead.

If you continue to experience issues, please let me know and we can investigate further.
