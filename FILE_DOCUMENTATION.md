# Project File Documentation

## Frontend Structure

### Root Files
- `index.html` - Entry point HTML file with root div and script imports
- `vite.config.ts` - Vite configuration including React plugin and dependency settings
- `tsconfig.json` - TypeScript configuration root file
- `tsconfig.app.json` - Application-specific TypeScript settings
- `tsconfig.node.json` - Node-specific TypeScript settings
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration for Tailwind

### Source Files (`src/`)

#### Core Files
- `main.tsx` - Application entry point that renders the root App component
- `App.tsx` - Root component with routing and context providers
- `index.css` - Global styles and Tailwind imports

#### Components (`src/components/`)
- `AuthDialog.tsx` - Authentication modal for login
- `CartDropdown.tsx` - Shopping cart dropdown menu
- `Filters.tsx` - Product filtering interface
- `Navbar.tsx` - Main navigation component
- `ProductCard.tsx` - Individual product display card
- `ProductGrid.tsx` - Grid layout for product listings
- `SearchResults.tsx` - Search results dropdown
- `ProfileForm.tsx` - User profile management form
- `AddressForm.tsx` - Shipping address management form
- `PaymentMethodForm.tsx` - Payment method management (used for checkout autofill)
- `StripeElementsCheckout.tsx` - Stripe Elements checkout component
- `StripeCheckoutWrapper.tsx` - Wrapper for Stripe checkout
- `DirectStripeCheckout.tsx` - Direct implementation of Stripe checkout
- `SimpleStripeCheckout.tsx` - Simplified Stripe checkout with autofill

#### Context (`src/context/`)
- `AuthContext.tsx` - Authentication state management
- `CartContext.tsx` - Shopping cart state management
- `SupabaseContext.tsx` - Supabase client provider

#### Pages (`src/pages/`)
- `HomePage.tsx` - Landing page with featured products
- `ProductsPage.tsx` - Product listing page with filters
- `ProductDetailsPage.tsx` - Individual product view
- `LoginPage.tsx` - User login page
- `SignUpPage.tsx` - User registration page
- `AccountPage.tsx` - User account management
- `ProfilePage.tsx` - User profile management
- `AddressesPage.tsx` - User shipping addresses management
- `PaymentMethodsPage.tsx` - User payment methods management (not accessible from UI)
- `OrdersPage.tsx` - User order history
- `ContactPage.tsx` - Contact form page
- `CheckoutPage.tsx` - Cart checkout process
- `CheckoutSuccessPage.tsx` - Order confirmation
- `CheckoutCancelPage.tsx` - Failed/cancelled checkout

##### Admin Pages (`src/pages/admin/`)
- `AdminLayout.tsx` - Admin dashboard layout wrapper
- `AdminLogin.tsx` - Admin authentication
- `ProductList.tsx` - Product management
- `InquiriesList.tsx` - Customer inquiries management
- `UserList.tsx` - User management
- `SettingsPage.tsx` - Site settings
- `CreateProduct.tsx` - New product form
- `EditProduct.tsx` - Product editing interface

#### Library (`src/lib/`)
- `stripe.ts` - Stripe payment integration
- `supabase.ts` - Supabase client configuration
- `supabase-storage.ts` - File storage utilities
- `orders.ts` - Order management utilities
- `utils.ts` - General utility functions

#### Types (`src/types/`)
- `index.ts` - TypeScript type definitions

#### Data (`src/data/`)
- `products.ts` - Sample product data

## Backend Structure (Supabase)

### Edge Functions (`supabase/functions/`)
- `create-coupon/` - Coupon creation endpoint
- `delete-coupon/` - Coupon deletion endpoint
- `stripe-checkout/` - Payment processing
- `stripe-payment-intent/` - Direct payment intent creation
- `stripe-webhook/` - Payment event handling
- `update-shipping/` - Shipping rate management

### Database Migrations (`supabase/migrations/`)
Contains SQL migrations for:
- Table creation
- RLS policies
- Stored procedures
- Trigger functions
- View definitions

Key migration files:
- `20240601_create_user_tables.sql` - Creates profiles table and update trigger
- `20240103000000_create_stripe_orders_table.sql` - Creates orders table for Stripe integration
- `20240104000000_create_stripe_customers_table.sql` - Creates customers table for Stripe integration
- `20240107000000_preserve_orders_data.sql` - Ensures order data is preserved during updates
- `20240108000000_simple_stripe_orders.sql` - Simplified orders schema for Stripe
- `20250315150150_small_coast.sql` - RLS policies for products management
- `20250315150153_bronze_hall.sql` - Product catalog table creation
- `20250315150156_little_meadow.sql` - Shopping cart functionality
- `20250319063223_summer_haze.sql` - Order processing workflows
- `20250331052445_heavy_snowflake.sql` - Shipping configuration
- `20250331054654_azure_pond.sql` - Coupon management
- `20250331055231_little_coral.sql` - Customer inquiries handling
- `20250414071924_misty_temple.sql` - User deletion functionality
- `20250501085249_billowing_harbor.sql` - User addresses management
- `20250501085356_odd_rain.sql` - Payment methods storage
- `20250507104135_floral_night.sql` - Order history and tracking

## Environment Configuration

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key

### Security
- Row Level Security (RLS) policies
- Authentication flows
- Role-based access control
- Secure payment processing

## Build System

### NPM Scripts
- `dev` - Development server
- `build` - Production build
- `lint` - Code linting
- `preview` - Production preview
- `add-user-data` - Add sample user data for testing
- `get-user-id` - Helper script to find user ID by email

### Dependencies
- React ecosystem
- Supabase client
- Stripe integration
- UI components
- Development tools