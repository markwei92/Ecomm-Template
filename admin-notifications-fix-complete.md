# Admin Notifications Fix Complete

I've completely rewritten the AdminNotificationsContext.tsx file to fix the syntax errors. The main issues were:

1. Missing catch clauses for try blocks
2. Improper nesting of try-catch blocks
3. Syntax errors in the code structure

## Changes Made

1. Completely restructured the fetchNotificationCounts function to use proper try-catch blocks
2. Added individual try-catch blocks for each database operation to improve error handling
3. Simplified the code flow to make it more maintainable
4. Removed problematic code that was causing syntax errors

## How to Deploy the Fix

The code changes have already been applied to your local files. Simply restart your development server:

```bash
npm run dev
```

## Testing

After deploying the fix, you should be able to:

1. View the admin dashboard without syntax errors
2. See orders, including guest orders, properly displayed
3. Manage orders just like before

The notification badges should now work correctly, and the admin dashboard should load without any errors.

## Additional Notes

The key improvements in the new code:

1. Each database operation has its own try-catch block for better error isolation
2. Variables are properly initialized before use
3. The code structure is more consistent and easier to follow
4. Error handling is more robust throughout the file

If you continue to experience issues, please let me know and we can investigate further.
