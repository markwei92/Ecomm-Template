# Checkout Autofill Feature

This feature allows the checkout page to automatically fill in user information from their profile, saved addresses, and payment methods.

## Database Setup

The feature requires three tables in your Supabase database:

1. `profiles` - Stores user profile information
2. `user_addresses` - Stores user shipping addresses
3. `user_payment_methods` - Stores user payment methods

A migration script is provided in `supabase/migrations/20240601_create_user_tables.sql` to create these tables.

## Running the Migration

To create the necessary tables in your Supabase database:

1. Connect to your Supabase project
2. Go to the SQL Editor
3. Copy the contents of `supabase/migrations/20240601_create_user_tables.sql`
4. Run the SQL script

## Adding Sample User Data

A script is provided to add sample user data for testing:

1. Make sure you're logged in to the application
2. Run the script:

```bash
node scripts/add_sample_user_data.js
```

This will add:
- A profile with name "John Doe" and phone "+1234567890"
- A default shipping address in San Francisco
- A default payment method with last four digits "4242"

## How the Autofill Works

When a user proceeds to checkout:

1. The StripeElementsCheckout component fetches the user's profile, default address, and default payment method
2. This information is used to pre-fill the Stripe Elements:
   - Email is pre-filled in the LinkAuthenticationElement
   - Name, address, and phone are pre-filled in the AddressElement
   - Cardholder name is pre-filled in the PaymentElement

## Customizing User Data

Users can manage their profile, addresses, and payment methods in the Account page. The checkout will always use the default address and payment method.

## Technical Implementation

The autofill feature uses:

1. Supabase database tables with Row Level Security
2. Stripe Elements with defaultValues options
3. React context for Supabase client access

## Troubleshooting

If autofill isn't working:

1. Check the browser console for errors
2. Verify the user is logged in
3. Verify the user has profile, address, and payment data in the database
4. Check that the Stripe Elements are properly initialized with defaultValues
