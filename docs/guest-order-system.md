# Guest Order System Documentation

This document provides comprehensive guidance on setting up, configuring, and troubleshooting the guest order system in the e-commerce application.

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Database Configuration](#database-configuration)
4. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
5. [Frontend Implementation](#frontend-implementation)
   - [Shipping Address Format Standardization](#shipping-address-format-standardization)
   - [Detecting Guest Users](#detecting-guest-users)
   - [Creating Guest Orders](#creating-guest-orders)
6. [Admin Dashboard Implementation](#admin-dashboard-implementation)
   - [Displaying Shipping Addresses](#displaying-shipping-addresses-in-the-admin-dashboard)
   - [Processing Orders with Different Address Formats](#processing-orders-with-different-address-formats)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
   - [RLS Policy Errors](#common-issues-and-solutions)
   - [React Rendering Errors](#common-issues-and-solutions)
   - [Missing Guest User ID](#common-issues-and-solutions)
   - [Other Common Issues](#common-issues-and-solutions)
9. [Maintenance](#maintenance)

## Overview

The guest order system allows users to complete purchases without creating an account. This feature is essential for reducing friction in the checkout process and increasing conversion rates. Guest orders are stored in the same `stripe_orders` table as regular user orders but are flagged with `is_guest = true` and use a special guest user ID.

## System Requirements

- Supabase project with PostgreSQL database
- Properly configured RLS policies
- Frontend implementation with guest user detection
- Stripe integration for payment processing

## Database Configuration

### Table Structure

The `stripe_orders` table must include the following fields to support guest orders:

```sql
CREATE TABLE stripe_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  customer_id TEXT,
  payment_intent_id TEXT,
  checkout_session_id TEXT,
  amount_total INTEGER,
  shipping_cost INTEGER,
  currency TEXT,
  payment_status TEXT,
  status TEXT,
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  shipping_status TEXT DEFAULT 'Order Sent',
  viewed BOOLEAN DEFAULT FALSE,
  discount_amount INTEGER DEFAULT 0,
  discount_type TEXT,
  discount_percentage INTEGER,
  shipping_address JSONB,
  customer_email TEXT,
  is_guest BOOLEAN DEFAULT FALSE
);
```

### Guest User ID

Create a special user ID for guest orders:

```sql
-- Insert a special user for guest orders if it doesn't exist
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'guest@example.com')
ON CONFLICT (id) DO NOTHING;
```

## Row Level Security (RLS) Policies

Enable RLS on the `stripe_orders` table:

```sql
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
```

### Required RLS Policies

1. **Allow inserting guest orders**:
   ```sql
   CREATE POLICY "Allow inserting guest orders"
   ON stripe_orders
   FOR INSERT TO public
   WITH CHECK (is_guest = true);
   ```

2. **Allow viewing guest orders**:
   ```sql
   CREATE POLICY "Allow viewing guest orders"
   ON stripe_orders
   FOR SELECT TO public
   USING (is_guest = true);
   ```

3. **Users can view their own orders**:
   ```sql
   CREATE POLICY "Users can view their own orders"
   ON stripe_orders
   FOR SELECT TO public
   USING (auth.uid() = user_id);
   ```

4. **Users can insert their own orders**:
   ```sql
   CREATE POLICY "Users can insert their own orders"
   ON stripe_orders
   FOR INSERT TO public
   WITH CHECK (auth.uid() = user_id);
   ```

5. **Admins can view all orders**:
   ```sql
   CREATE POLICY "Admins can view all orders"
   ON stripe_orders
   FOR SELECT TO public
   USING (auth.uid() IN (SELECT user_id FROM admin_users));
   ```

6. **Admins can update all orders**:
   ```sql
   CREATE POLICY "Admins can update all orders"
   ON stripe_orders
   FOR UPDATE TO public
   USING (auth.uid() IN (SELECT user_id FROM admin_users));
   ```

## Frontend Implementation

### Shipping Address Format Standardization

To ensure consistency and prevent rendering errors, always use a standardized format for shipping addresses. This is especially important for guest orders where the address format might vary.

```typescript
// Standardized shipping address format
interface StandardShippingAddress {
  name?: string;       // Full name (e.g., "John Doe")
  line1: string;       // Street address, line 1 (e.g., "123 Main St")
  line2?: string;      // Street address, line 2 (e.g., "Apt 4B")
  city: string;        // City (e.g., "New York")
  state: string;       // State/Province/Region (e.g., "NY")
  postal_code: string; // Postal/ZIP code (e.g., "10001")
  country: string;     // Country (e.g., "US")
  phone?: string;      // Phone number (e.g., "+1234567890")
  email?: string;      // Email address (e.g., "john@example.com")
}

// Function to normalize shipping address from various formats
function normalizeShippingAddress(address: any, firstName: string = '', lastName: string = ''): StandardShippingAddress {
  if (!address || typeof address !== 'object') {
    return {
      name: `${firstName} ${lastName}`.trim() || undefined,
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: ''
    };
  }

  // Create a normalized address with type checking
  return {
    name: typeof address.name === 'string' ? address.name :
          (`${firstName} ${lastName}`.trim() || undefined),
    line1: typeof address.line1 === 'string' ? address.line1 :
           (typeof address.street === 'string' ? address.street : ''),
    line2: typeof address.line2 === 'string' ? address.line2 : undefined,
    city: typeof address.city === 'string' ? address.city : '',
    state: typeof address.state === 'string' ? address.state : '',
    postal_code: typeof address.postal_code === 'string' ? address.postal_code :
                (typeof address.zip === 'string' ? address.zip : ''),
    country: typeof address.country === 'string' ? address.country : '',
    phone: typeof address.phone === 'string' ? address.phone : undefined,
    email: typeof address.email === 'string' ? address.email : undefined
  };
}
```

### Detecting Guest Users

```typescript
// Check if user is authenticated
const { data: { session } } = await supabase.auth.getSession();
const customUser = localStorage.getItem('user');
const isGuestUser = !session && !customUser;
```

### Creating Guest Orders

```typescript
// For guest users
if (isGuestUser) {
  // Use a fixed guest user ID
  const guestUuid = '00000000-0000-0000-0000-000000000001';

  // Create a customer ID for the guest user
  const guestCustomerId = `cus_guest_${Date.now().toString(36).substring(0, 8)}`;

  // Create order data
  const orderData = {
    user_id: guestUuid,
    customer_id: guestCustomerId,
    payment_intent_id: paymentIntentId,
    amount_total: Math.round(totalAmount * 100), // Convert to cents
    currency: 'usd',
    payment_status: 'succeeded',
    status: 'completed',
    items: items,
    shipping_cost: Math.round(shipping * 100),
    discount_amount: Math.round(orderDiscount * 100),
    discount_type: promoCodeValid ? discount.type : null,
    promo_code: promoCodeValid ? promoCode : null,
    shipping_address: shippingAddress,
    discount_percentage: promoCodeValid && discount.type === 'percentage' ?
      parseInt(discount.amount.toString()) : null,
    is_guest: true, // This is the key flag that identifies a guest order
    customer_email: shippingAddress?.email || null
  };

  // Insert the order
  const { data: order, error } = await supabase
    .from('stripe_orders')
    .insert(orderData)
    .select();
}
```

### Redirecting After Checkout

```typescript
// Navigate to success page with the payment intent ID
// For guest users, add a guest=true parameter
if (isGuestUser) {
  navigate(`/checkout/success?payment_intent_id=${paymentIntentId}&guest=true`);
} else {
  navigate(`/checkout/success?payment_intent_id=${paymentIntentId}`);
}
```

## Testing

### Test Script for Guest Order Insertion

Create a test script to verify guest order functionality:

```javascript
// test-guest-order.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testGuestOrderInsertion() {
  try {
    // Create a test guest order
    const testOrder = {
      payment_intent_id: 'test_guest_' + Date.now(),
      is_guest: true,
      user_id: '00000000-0000-0000-0000-000000000001', // Guest user ID
      customer_id: 'cus_guest_test',
      amount_total: 1000, // $10.00
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
      shipping_cost: 400, // $4.00
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

## Troubleshooting

### Common Issues and Solutions

1. **RLS Policy Errors**

   **Issue**: "new row violates row-level security policy for table 'stripe_orders'"

   **Solution**:
   - Verify that the RLS policy for guest orders exists and is correctly configured
   - Check that the `is_guest` field is set to `true` in the order data
   - Ensure the guest user ID exists in the auth.users table

1. **React Error: Objects are not valid as a React child**

   **Issue**: "Uncaught Error: Objects are not valid as a React child (found: object with keys {city, line1, line2, state, country, postal_code})"

   **Solution**:
   - This error occurs when trying to render shipping address objects directly in the React component
   - Always add type checking for shipping address fields before rendering them
   - Use the following pattern for all address fields:

   ```tsx
   // Check if shipping_address is an object
   {order.shipping_address && typeof order.shipping_address === 'object' ? (
     <div>
       {/* Display name if available and is a string */}
       {typeof order.shipping_address.name === 'string' && (
         <div className="truncate font-medium">{order.shipping_address.name}</div>
       )}

       {/* Display address line 1 if it's a string */}
       {typeof order.shipping_address.line1 === 'string' && (
         <div className="truncate">{order.shipping_address.line1}</div>
       )}

       {/* Display city, state, postal code with type checking */}
       <div className="truncate">
         {typeof order.shipping_address.city === 'string' ? order.shipping_address.city : ''}
         {typeof order.shipping_address.city === 'string' && order.shipping_address.city ? ', ' : ''}
         {typeof order.shipping_address.state === 'string' ? order.shipping_address.state : ''}
         {typeof order.shipping_address.postal_code === 'string' ? order.shipping_address.postal_code : ''}
       </div>
     </div>
   ) : (
     <span>No address available</span>
   )}
   ```

   - When normalizing shipping addresses, always ensure all fields are strings:

   ```tsx
   // Create a normalized address with type checking
   normalizedShippingAddress = {
     name: typeof addressObj.name === 'string' ? addressObj.name : `${firstName} ${lastName}`.trim(),
     line1: typeof addressObj.line1 === 'string' ? addressObj.line1 :
            (typeof addressObj.street === 'string' ? addressObj.street : ''),
     line2: typeof addressObj.line2 === 'string' ? addressObj.line2 : null,
     city: typeof addressObj.city === 'string' ? addressObj.city : '',
     state: typeof addressObj.state === 'string' ? addressObj.state : '',
     postal_code: typeof addressObj.postal_code === 'string' ? addressObj.postal_code : '',
     country: typeof addressObj.country === 'string' ? addressObj.country : '',
     phone: typeof addressObj.phone === 'string' ? addressObj.phone : null,
     email: typeof addressObj.email === 'string' ? addressObj.email : null
   };
   ```

2. **Missing Guest User ID**

   **Issue**: Foreign key constraint violation when inserting guest orders

   **Solution**:
   - Create the special guest user ID in the auth.users table
   - Verify that the guest user ID is correctly referenced in the order data

3. **Unable to View Guest Orders**

   **Issue**: Guest orders not appearing in the admin dashboard or order history

   **Solution**:
   - Check the RLS policy for viewing guest orders
   - Verify that the admin RLS policy includes guest orders
   - Ensure the query includes orders where `is_guest = true`

4. **API Key Issues**

   **Issue**: "Invalid API key" error when testing

   **Solution**:
   - Verify that the anon key is correctly copied from Supabase
   - Check that the key has not expired
   - Ensure the key has the necessary permissions

## Admin Dashboard Implementation

### Displaying Shipping Addresses in the Admin Dashboard

When displaying shipping addresses in the admin dashboard, always use type checking to prevent React rendering errors:

```tsx
// Example of safely displaying shipping address in the admin dashboard
function OrderAddressDisplay({ order }) {
  return (
    <td className="px-3 py-4 text-sm text-gray-500">
      {order.shipping_address && typeof order.shipping_address === 'object' ? (
        <div>
          {/* Display name if available */}
          {typeof order.shipping_address.name === 'string' && (
            <div className="truncate font-medium">{order.shipping_address.name}</div>
          )}

          {/* Display address line 1 */}
          {typeof order.shipping_address.line1 === 'string' && (
            <div className="truncate">{order.shipping_address.line1}</div>
          )}
          {(!order.shipping_address.line1 || typeof order.shipping_address.line1 !== 'string') &&
           typeof order.shipping_address.street === 'string' && (
            <div className="truncate">{order.shipping_address.street}</div>
          )}

          {/* Display address line 2 if available */}
          {typeof order.shipping_address.line2 === 'string' && (
            <div className="truncate">{order.shipping_address.line2}</div>
          )}

          {/* City, State, Postal Code */}
          <div className="truncate">
            {typeof order.shipping_address.city === 'string' ? order.shipping_address.city : ''}
            {typeof order.shipping_address.city === 'string' && order.shipping_address.city ? ', ' : ''}
            {typeof order.shipping_address.state === 'string' ? order.shipping_address.state : ''}
            {typeof order.shipping_address.postal_code === 'string' ? order.shipping_address.postal_code : ''}
          </div>

          {/* Country */}
          <div>{typeof order.shipping_address.country === 'string' ? order.shipping_address.country : ''}</div>

          {/* Phone if available */}
          {typeof order.shipping_address.phone === 'string' && (
            <div className="text-xs mt-1">Phone: {order.shipping_address.phone}</div>
          )}
        </div>
      ) : (
        <span className="text-gray-400">No address available</span>
      )}
    </td>
  );
}
```

### Processing Orders with Different Address Formats

When processing orders in the admin dashboard, normalize the shipping address format:

```tsx
// Example of normalizing shipping addresses when fetching orders
const ordersWithDetails = await Promise.all(ordersData.map(async order => {
  // ... other processing ...

  // Normalize the shipping address format to ensure compatibility
  let normalizedShippingAddress = null;

  if (order.shipping_address) {
    // Check if we have a shipping address in the new format (with line1, line2)
    if (typeof order.shipping_address === 'object') {
      if ('line1' in order.shipping_address) {
        normalizedShippingAddress = {
          name: typeof order.shipping_address.name === 'string' ? order.shipping_address.name : `${firstName} ${lastName}`.trim(),
          line1: typeof order.shipping_address.line1 === 'string' ? order.shipping_address.line1 : '',
          line2: typeof order.shipping_address.line2 === 'string' ? order.shipping_address.line2 : null,
          city: typeof order.shipping_address.city === 'string' ? order.shipping_address.city : '',
          state: typeof order.shipping_address.state === 'string' ? order.shipping_address.state : '',
          postal_code: typeof order.shipping_address.postal_code === 'string' ? order.shipping_address.postal_code : '',
          country: typeof order.shipping_address.country === 'string' ? order.shipping_address.country : '',
          phone: typeof order.shipping_address.phone === 'string' ? order.shipping_address.phone : null,
          email: typeof order.shipping_address.email === 'string' ? order.shipping_address.email : null
        };
      }
      // Check if we have a shipping address in the old format (with street)
      else if ('street' in order.shipping_address) {
        normalizedShippingAddress = {
          name: `${firstName} ${lastName}`.trim(),
          line1: typeof order.shipping_address.street === 'string' ? order.shipping_address.street : '',
          line2: null,
          city: typeof order.shipping_address.city === 'string' ? order.shipping_address.city : '',
          state: typeof order.shipping_address.state === 'string' ? order.shipping_address.state : '',
          postal_code: typeof order.shipping_address.postal_code === 'string' ? order.shipping_address.postal_code : '',
          country: typeof order.shipping_address.country === 'string' ? order.shipping_address.country : '',
          phone: null
        };
      }
    }
  }

  return {
    ...order,
    shipping_address: normalizedShippingAddress,
    // ... other fields ...
  };
}));
```

## Maintenance

### Regular Checks

1. Periodically verify that the RLS policies are still in place and functioning correctly
2. Monitor the number of guest orders vs. registered user orders
3. Check for any changes in the Supabase or Stripe APIs that might affect guest order functionality
4. Verify that shipping address normalization is working correctly in the admin dashboard

### Updating the System

When updating the system, ensure that:

1. Any changes to the database schema include the `is_guest` field
2. RLS policies are updated to maintain guest order functionality
3. Frontend code continues to handle guest users correctly
4. Test the guest order flow after any significant updates
