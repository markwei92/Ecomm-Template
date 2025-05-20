# Order Diagnostic Page Instructions

I've created a dedicated diagnostic page to help identify and fix the issue with guest orders not appearing in the admin dashboard. This page will:

1. Check for all orders in the database
2. Specifically look for guest orders
3. Display the raw data for inspection
4. Provide a button to apply the SQL fix

## How to Access the Diagnostic Page

There are two ways to access the diagnostic page:

1. **From the Admin Dashboard**: I've added a new "Order Diagnostic" link in the admin sidebar navigation
2. **Direct URL**: You can also access the page directly at `/order-diagnostic`

## Using the Diagnostic Page

1. When you open the page, it will automatically fetch and display:
   - A diagnostic log with detailed information about orders in the database
   - A table of all recent orders
   - A table of guest orders (if any)

2. The "Apply SQL Fix" button will:
   - Update any orders with the guest user ID to have is_guest=true
   - Update any orders with 'guest' in the payment_intent_id to have is_guest=true
   - Refresh the data to show the updated orders

3. After applying the fix, you can click "Go to Admin Orders" to check if the guest orders now appear in the admin dashboard

## Testing the Guest Checkout Flow

After using the diagnostic page and applying the SQL fix, you should test the guest checkout flow again:

1. Add items to cart as a guest user
2. Complete checkout
3. Verify that the success page shows the appropriate message
4. Check the diagnostic page to verify that the order was created with is_guest=true
5. Check the admin dashboard to verify that the order appears there with the correct details

## What to Look For

The diagnostic page will help identify several potential issues:

1. **Missing is_guest flag**: If orders have the guest user ID but is_guest is not true
2. **Incorrect shipping address format**: If the shipping address is using street instead of line1
3. **Missing orders**: If guest orders are not being created in the database at all

The SQL fix will address the first issue, and the diagnostic page will help identify if there are other issues that need to be fixed.

If you continue to have issues after using the diagnostic page, please let me know and I'll help troubleshoot further.
