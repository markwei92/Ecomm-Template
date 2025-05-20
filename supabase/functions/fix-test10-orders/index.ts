import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { Stripe } from 'https://esm.sh/stripe@12.18.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Starting to fix TEST10 orders');

    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('stripe_orders')
      .select('id, payment_intent_id, items, discount_amount, discount_type, discount_percentage, shipping_cost')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return corsResponse({ error: 'Failed to fetch orders', details: ordersError }, 500);
    }

    console.log(`Found ${orders.length} orders to check`);

    const updatedOrders = [];
    const failedOrders = [];

    // Process each order
    for (const order of orders) {
      try {
        // Skip orders without payment intent ID
        if (!order.payment_intent_id) {
          console.log(`Order ${order.id} has no payment intent ID, skipping`);
          continue;
        }

        // Get the payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(order.payment_intent_id);

        // Check if this order used TEST10
        if (paymentIntent.metadata?.promo_code === 'TEST10') {
          console.log(`Order ${order.id} used TEST10 promo code`);

          // Calculate the correct discount amount (10%)
          if (order.items && order.items.length > 0) {
            const calculatedSubtotal = order.items.reduce((sum, item) =>
              sum + (parseFloat(item.price) * item.quantity * 100), 0);

            const correctDiscountAmount = (calculatedSubtotal * 10) / 100;

            // Calculate total quantity for shipping cost
            const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

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

            // Calculate shipping cost based on quantity and configuration
            let correctShippingCost = baseShippingCost;
            if (totalQuantity > 1) {
              correctShippingCost = baseShippingCost + ((totalQuantity - 1) * additionalItemCost);
            }

            console.log(`Order ${order.id}: Calculated 10% discount = $${correctDiscountAmount / 100}, shipping = $${correctShippingCost / 100}`);

            // Update the order
            const { error: updateError } = await supabase
              .from('stripe_orders')
              .update({
                discount_amount: correctDiscountAmount,
                discount_type: 'percentage',
                discount_percentage: 10, // Force to exactly 10%
                shipping_cost: correctShippingCost,
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id);

            if (updateError) {
              console.error(`Error updating order ${order.id}:`, updateError);
              failedOrders.push({ id: order.id, error: updateError });
            } else {
              console.log(`Successfully updated order ${order.id}`);
              updatedOrders.push(order.id);

              // Update the payment intent description
              try {
                let description = `Order with 10% discount (-$${(correctDiscountAmount / 100).toFixed(2)}), $${(correctShippingCost / 100).toFixed(2)} shipping`;

                await stripe.paymentIntents.update(order.payment_intent_id, {
                  description: description
                });

                console.log(`Updated payment intent description for ${order.id}: ${description}`);
              } catch (descError) {
                console.error(`Error updating payment intent description for ${order.id}:`, descError);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        failedOrders.push({ id: order.id, error });
      }
    }

    return corsResponse({
      success: true,
      message: `Processed ${orders.length} orders`,
      updated: updatedOrders.length,
      updatedOrders,
      failed: failedOrders.length,
      failedOrders
    });
  } catch (error) {
    console.error('Error fixing TEST10 orders:', error);
    return corsResponse({ error: 'Internal server error', details: error }, 500);
  }
});
