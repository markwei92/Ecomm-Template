// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import Stripe from "https://esm.sh/stripe@12.18.0"

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define a more comprehensive set of CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-guest-checkout, x-guest-id, x-custom-auth, x-user-id, x-guest-checkout, x-guest-id',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

// Helper function to create responses with CORS headers
function corsResponse(body: any, status = 200) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        // Ensure all headers are explicitly allowed
        'Access-Control-Allow-Headers': req.headers.get('Access-Control-Request-Headers') || corsHeaders['Access-Control-Allow-Headers']
      }
    });
  }

  if (req.method !== 'POST') {
    return corsResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Parse request body once
    const requestBody = await req.json();
    const { items, promoCode } = requestBody;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return corsResponse({ error: 'Items are required and must be an array' }, 400);
    }

    // Validate promo code if provided
    let coupon = null;
    if (promoCode) {
      try {
        // First, try to find the promotion code
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1
        });

        if (promotionCodes.data.length > 0) {
          coupon = promotionCodes.data[0].coupon;
        } else {
          // If not found as a promotion code, try to find it as a coupon
          const coupons = await stripe.coupons.list({
            limit: 100
          });

          coupon = coupons.data.find(c => c.id === promoCode && c.valid);
        }
      } catch (error) {
        console.error('Error validating promo code:', error);
        // We'll continue without the promo code if there's an error
      }
    }

    // We already parsed the request body above

    // Check for user ID in different ways
    let userId = null;
    let isGuestUser = false;

    // Method 1: Check for Supabase Auth token
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);

      if (!getUserError && user) {
        console.log('Authenticated via Supabase Auth token');
        userId = user.id;
      } else {
        console.log('Supabase Auth token validation failed:', getUserError);
      }
    }

    // Method 2: Check for custom auth headers
    if (!userId && req.headers.get('X-Custom-Auth') === 'true') {
      const customUserId = req.headers.get('X-User-ID');
      if (customUserId) {
        console.log('Authenticated via custom auth headers');
        userId = customUserId;
      }
    }

    // Method 3: Check for guest checkout via headers
    if (!userId && req.headers.get('X-Guest-Checkout') === 'true') {
      const guestId = req.headers.get('X-Guest-ID');
      if (guestId) {
        console.log('Guest checkout detected via headers');
        userId = guestId;
        isGuestUser = true;
      }
    }

    // Method 3b: Check for guest checkout via request body
    if (!userId && requestBody.isGuestUser && requestBody.guestId) {
      console.log('Guest checkout detected via request body');
      userId = requestBody.guestId;
      isGuestUser = true;
    }

    // Method 4: Check for user ID in request body
    if (!userId && requestBody.userId) {
      console.log('Using user ID from request body');
      userId = requestBody.userId;
      // Check if this is a guest ID
      if (userId.startsWith('guest_')) {
        isGuestUser = true;
      }
    }

    // If no user ID found, return error
    if (!userId) {
      console.error('No valid authentication method found');
      return corsResponse({ error: 'Authentication required' }, 401);
    }

    console.log(`User ID: ${userId}, Guest user: ${isGuestUser}`);

    // For compatibility with the rest of the function
    const user = { id: userId, email: requestBody.email || 'unknown@example.com' };

    let customerId: string;

    // For guest users, create a temporary customer without storing in the database
    if (isGuestUser) {
      console.log('Creating temporary Stripe customer for guest user');

      // Create new customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
          isGuest: 'true'
        },
      });

      console.log(`Created new temporary Stripe customer ${newCustomer.id} for guest user ${user.id}`);
      customerId = newCustomer.id;
    } else {
      // For authenticated users, get or create a persistent customer
      const { data: customer, error: getCustomerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (getCustomerError) {
        console.error('Failed to fetch customer information from the database', getCustomerError);
        return corsResponse({ error: 'Failed to fetch customer information' }, 500);
      }

      if (!customer || !customer.customer_id) {
        // Create new customer
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });

        console.log(`Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

        const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
          user_id: user.id,
          customer_id: newCustomer.id,
        });

        if (createCustomerError) {
          console.error('Failed to save customer information in the database', createCustomerError);
          return corsResponse({ error: 'Failed to create customer mapping' }, 500);
        }

        customerId = newCustomer.id;
      } else {
        customerId = customer.customer_id;
      }
    }

    // Calculate the total amount
    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) =>
      sum + Math.round(item.price * 100) * item.quantity, 0);

    // Calculate total quantity for shipping cost
    const totalQuantity = items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);

    // Get shipping configuration from database
    let baseShippingCost = 400; // Default: $4.00 in cents
    let additionalItemCost = 100; // Default: $1.00 in cents

    try {
      // Fetch shipping configuration
      const shippingConfigResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/shipping-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        }
      });

      if (shippingConfigResponse.ok) {
        const shippingConfig = await shippingConfigResponse.json();
        baseShippingCost = shippingConfig.base_shipping_cost;
        additionalItemCost = shippingConfig.additional_item_cost;
        console.log(`Using shipping config from database: base=$${baseShippingCost / 100}, additional=$${additionalItemCost / 100}`);
      } else {
        console.error('Error fetching shipping config, using defaults');
      }
    } catch (error) {
      console.error('Error fetching shipping config:', error);
    }

    // Check if shipping cost was provided in the request (for guest users)
    let shippingCost = 0;

    if (requestBody.shipping_cost !== undefined) {
      // Use the shipping cost provided by the client
      const providedCost = parseFloat(requestBody.shipping_cost);

      // Check if the shipping cost is already in cents (greater than 100)
      if (providedCost > 100) {
        // Assume it's already in cents
        shippingCost = providedCost;
        console.log(`Using shipping cost from request (already in cents): ${shippingCost} cents`);
      } else {
        // Convert from dollars to cents
        shippingCost = Math.round(providedCost * 100);
        console.log(`Using shipping cost from request: $${providedCost} (${shippingCost} cents)`);
      }
    } else {
      // Calculate shipping cost based on quantity and configuration
      shippingCost = baseShippingCost;
      if (totalQuantity > 1) {
        shippingCost = baseShippingCost + ((totalQuantity - 1) * additionalItemCost);
      }
      console.log(`Calculated shipping cost: $${shippingCost / 100} for ${totalQuantity} items`);
    }

    // Create a PaymentIntent with optional coupon
    const paymentIntentParams: any = {
      amount: subtotal, // Will be updated after discount calculation
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.id,
        is_guest: isGuestUser ? 'true' : 'false',
        items: JSON.stringify(items.map((item: any) => ({
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          color: item.color,
          size: item.size,
          image: item.image,
          personalizationText: item.personalizationText
        }))),
        shipping_cost: shippingCost
      }
    };

    // Get shipping address from request if available
    if (req.body.shippingAddress) {
      console.log('Shipping address provided in request:', req.body.shippingAddress);
      paymentIntentParams.shipping = {
        name: req.body.shippingAddress.name,
        address: {
          line1: req.body.shippingAddress.address.line1,
          line2: req.body.shippingAddress.address.line2 || null,
          city: req.body.shippingAddress.address.city,
          state: req.body.shippingAddress.address.state,
          postal_code: req.body.shippingAddress.address.postal_code,
          country: req.body.shippingAddress.address.country,
        },
        phone: req.body.shippingAddress.phone
      };
    }

    // Add discount if coupon is valid
    if (coupon) {
      paymentIntentParams.discounts = [{
        coupon: coupon.id
      }];

      // Add the promo code and discount details to metadata for reference
      paymentIntentParams.metadata.promo_code = promoCode;

      // Add discount type and amount to metadata
      if (coupon.percent_off) {
        paymentIntentParams.metadata.discount_type = 'percentage';

        // Force TEST10 to be exactly 10% (fix for rounding issues)
        let discountPercentage = coupon.percent_off;
        if (promoCode === 'TEST10') {
          discountPercentage = 10;
          console.log('TEST10 promo code detected, forcing discount to exactly 10%');
        }

        paymentIntentParams.metadata.discount_percentage = discountPercentage.toString();

        // Store the original coupon percent_off for debugging
        paymentIntentParams.metadata.original_percent_off = coupon.percent_off.toString();

        // Calculate the discount amount based on the subtotal
        const discountAmount = Math.round((subtotal * discountPercentage) / 100);
        paymentIntentParams.metadata.discount_amount = discountAmount.toString();

        console.log(`Applying percentage discount: ${discountPercentage}% of $${subtotal / 100} = $${discountAmount / 100}`);

        // Update the final amount with discount and shipping
        paymentIntentParams.amount = subtotal - discountAmount + shippingCost;
      } else if (coupon.amount_off) {
        paymentIntentParams.metadata.discount_type = 'fixed_amount';
        paymentIntentParams.metadata.discount_amount = coupon.amount_off.toString();

        console.log(`Applying fixed amount discount: $${coupon.amount_off / 100}`);

        // Update the final amount with discount and shipping
        paymentIntentParams.amount = subtotal - coupon.amount_off + shippingCost;
      }

      console.log('Adding discount to payment intent:', {
        coupon_id: coupon.id,
        discount_type: paymentIntentParams.metadata.discount_type,
        discount_amount: paymentIntentParams.metadata.discount_amount,
        discount_percentage: paymentIntentParams.metadata.discount_percentage,
        final_amount: paymentIntentParams.amount
      });
    } else {
      // No discount, just add shipping to the amount
      paymentIntentParams.amount = subtotal + shippingCost;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    console.log(`Created payment intent ${paymentIntent.id} for customer ${customerId}`);

    // Return the client secret
    return corsResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error: any) {
    console.error('Payment intent error:', error);
    return corsResponse({
      error: error.message || 'An unexpected error occurred',
      details: error.stack
    }, 500);
  }
});
