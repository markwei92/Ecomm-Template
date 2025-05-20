import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Define comprehensive CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-guest-checkout, x-guest-id, x-custom-auth, x-user-id',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

// Helper function to handle CORS
function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    },
  });
}

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Get the customer ID from the URL
    const url = new URL(req.url);
    const customerId = url.searchParams.get('customer_id');

    if (!customerId) {
      return corsResponse({ error: 'Missing customer_id parameter' }, 400);
    }

    // Check if this is a guest customer ID (starts with cus_guest_)
    if (customerId.startsWith('cus_guest_')) {
      console.log('Guest customer ID detected:', customerId);
      // For guest customers, return a mock customer object
      return corsResponse({
        id: customerId,
        email: 'guest@example.com',
        name: 'Guest User',
        phone: null,
        metadata: {
          isGuest: 'true'
        }
      });
    }

    // For regular customers, get from Stripe
    const customer = await stripe.customers.retrieve(customerId);

    if (!customer || customer.deleted) {
      return corsResponse({ error: 'Customer not found or deleted' }, 404);
    }

    // Return the customer information
    return corsResponse({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      metadata: customer.metadata,
    });
  } catch (error: any) {
    console.error('Error retrieving customer:', error);
    return corsResponse({
      error: error.message || 'An unexpected error occurred',
      details: error.stack
    }, 500);
  }
});
