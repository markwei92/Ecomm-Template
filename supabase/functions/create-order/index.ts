// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return corsResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { 
      paymentIntentId, 
      userId, 
      customerId, 
      amount, 
      items 
    } = await req.json();

    if (!paymentIntentId || !userId || !customerId || !amount) {
      return corsResponse({ 
        error: 'Missing required fields', 
        required: ['paymentIntentId', 'userId', 'customerId', 'amount'] 
      }, 400);
    }

    // Check if an order with this payment intent already exists
    const { data: existingOrder, error: checkError } = await supabase
      .from('stripe_orders')
      .select('id')
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking for existing order:', checkError);
      return corsResponse({ error: 'Error checking for existing order', details: checkError }, 500);
    }
    
    if (existingOrder) {
      console.log('Order already exists for this payment intent:', existingOrder);
      return corsResponse({ 
        message: 'Order already exists', 
        id: existingOrder.id 
      });
    }

    // Create the order with service role privileges
    const { data: order, error } = await supabase
      .from('stripe_orders')
      .insert({
        payment_intent_id: paymentIntentId,
        user_id: userId,
        customer_id: customerId,
        amount_total: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_status: 'succeeded',
        status: 'completed',
        items: items || []
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating order:', error);
      return corsResponse({ error: 'Failed to create order', details: error }, 500);
    }

    console.log('Order created successfully:', order);
    return corsResponse({ 
      message: 'Order created successfully', 
      id: order.id 
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return corsResponse({
      error: error.message || 'An unexpected error occurred',
      details: error.stack
    }, 500);
  }
});
