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
    const { code, type, amount, valid_from, expires_at, usage_limit } = await req.json();

    // Validate inputs
    if (!code || !type || amount === undefined) {
      throw new Error('Missing required fields');
    }

    if (type !== 'percentage' && type !== 'fixed_amount') {
      throw new Error('Invalid discount type');
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (type === 'percentage' && amount > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    // Create coupon in Stripe
    const coupon = await stripe.coupons.create({
      name: code,
      duration: expires_at ? 'once' : 'forever',
      ...(expires_at && { redeem_by: Math.floor(new Date(expires_at).getTime() / 1000) }),
      ...(usage_limit && { max_redemptions: usage_limit }),
      ...(type === 'percentage'
        ? { percent_off: amount }
        : { amount_off: Math.round(amount * 100), currency: 'usd' }),
    });

    // Create promotion code
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      active: true,
      ...(valid_from && { starts_at: Math.floor(new Date(valid_from).getTime() / 1000) }),
    });

    return new Response(
      JSON.stringify({ 
        stripe_id: promotionCode.id,
        coupon_id: coupon.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating coupon:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});