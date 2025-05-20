import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@17.7.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // Verify request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { base_price, additional_item_price } = await req.json();

    // Validate prices
    if (typeof base_price !== 'number' || base_price < 0) {
      throw new Error('Invalid base shipping price');
    }
    
    if (typeof additional_item_price !== 'number' || additional_item_price < 0) {
      throw new Error('Invalid additional item price');
    }

    console.log('Updating shipping rates with:', { base_price, additional_item_price });

    // Get existing shipping rates
    const { data: existingRates } = await stripe.shippingRates.list({
      active: true,
      limit: 1
    });

    console.log('Existing rates:', existingRates);

    let shippingRate;

    // Update or create shipping rate
    if (existingRates && existingRates.length > 0) {
      console.log('Updating existing shipping rate');
      // Deactivate existing rate since Stripe doesn't allow updating amount
      await stripe.shippingRates.update(existingRates[0].id, {
        active: false
      });
      
      // Create new rate
      shippingRate = await stripe.shippingRates.create({
        display_name: 'Standard Shipping',
        type: 'fixed_amount',
        fixed_amount: {
          amount: Math.round(base_price * 100),
          currency: 'usd'
        },
        metadata: {
          additional_item_amount: additional_item_price.toString()
        }
      });
    } else {
      console.log('Creating new shipping rate');
      shippingRate = await stripe.shippingRates.create({
        display_name: 'Standard Shipping',
        type: 'fixed_amount',
        fixed_amount: {
          amount: Math.round(base_price * 100),
          currency: 'usd'
        },
        metadata: {
          additional_item_amount: additional_item_price.toString()
        }
      });
    }

    console.log('Shipping rate updated successfully:', shippingRate);

    return new Response(
      JSON.stringify({ success: true, shipping_rate: shippingRate }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating shipping:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});