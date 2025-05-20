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
    const { orderId, discountAmount, discountType, discountPercentage } = await req.json();

    if (!orderId) {
      return corsResponse({ error: 'Order ID is required' }, 400);
    }

    console.log('Updating discount for order:', orderId);

    // First, check if the order exists
    const { data: existingOrder, error: findError } = await supabase
      .from('stripe_orders')
      .select('id, payment_intent_id, amount_total, items, shipping_cost')
      .eq('id', orderId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding order:', findError);
      return corsResponse({ error: 'Failed to find order', details: findError }, 500);
    }

    if (!existingOrder) {
      console.log('No order found with ID:', orderId);
      return corsResponse({ error: 'Order not found' }, 404);
    }

    console.log('Found order:', existingOrder.id);

    // Calculate discount if not provided
    let finalDiscountAmount = discountAmount;
    let finalDiscountType = discountType;
    let finalDiscountPercentage = discountPercentage;

    // Check if this order used a promo code
    const { data: orderData, error: orderError } = await supabase
      .from('stripe_orders')
      .select('payment_intent_id')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error getting payment intent ID:', orderError);
    } else if (orderData?.payment_intent_id) {
      // Try to get the payment intent to check for promo code
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(orderData.payment_intent_id);

        if (paymentIntent.metadata?.promo_code === 'TEST10') {
          console.log('Found TEST10 promo code in payment intent metadata');
          finalDiscountType = 'percentage';
          finalDiscountPercentage = 10; // Force to exactly 10%

          // Calculate discount amount based on subtotal
          if (existingOrder.items && existingOrder.items.length > 0) {
            const calculatedSubtotal = existingOrder.items.reduce((sum, item) =>
              sum + (parseFloat(item.price) * item.quantity * 100), 0);

            // Always use exactly 10% for TEST10 - no rounding
            finalDiscountAmount = (calculatedSubtotal * 10) / 100;

            console.log(`Calculated TEST10 discount: 10% of $${calculatedSubtotal / 100} = $${finalDiscountAmount / 100}`);

            // Log original percentage if available
            if (paymentIntent.metadata?.original_percent_off) {
              console.log(`Original percent_off was ${paymentIntent.metadata.original_percent_off}%, forcing to 10%`);
            }

            // Update the payment intent description to show correct percentage
            try {
              let description = `Order with 10% discount (-$${(finalDiscountAmount / 100).toFixed(2)})`;

              // Add shipping info if available
              if (existingOrder.shipping_cost) {
                description += `, $${(existingOrder.shipping_cost / 100).toFixed(2)} shipping`;
              }

              await stripe.paymentIntents.update(paymentIntent.id, {
                description: description
              });

              console.log(`Updated payment intent description: ${description}`);
            } catch (descError) {
              console.error('Error updating payment intent description:', descError);
            }
          }
        }
      } catch (error) {
        console.error('Error retrieving payment intent:', error);
      }
    }

    // If we still don't have discount info, calculate it from the total
    if (!finalDiscountAmount && existingOrder.items && existingOrder.items.length > 0) {
      // Calculate what the total should be without discount
      const calculatedSubtotal = existingOrder.items.reduce((sum, item) =>
        sum + (parseFloat(item.price) * item.quantity * 100), 0);

      // Calculate shipping cost based on item quantity
      const totalQuantity = existingOrder.items.reduce((sum, item) => sum + item.quantity, 0);
      let calculatedShippingCost = existingOrder.shipping_cost || 500;

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

      // If shipping cost seems incorrect, recalculate it
      if (totalQuantity > 1 && calculatedShippingCost === 500) {
        calculatedShippingCost = baseShippingCost + ((totalQuantity - 1) * additionalItemCost);
        console.log(`Recalculated shipping cost: $${calculatedShippingCost / 100} for ${totalQuantity} items`);

        // Update the shipping cost in the database
        const { error: shippingError } = await supabase
          .from('stripe_orders')
          .update({ shipping_cost: calculatedShippingCost })
          .eq('id', orderId);

        if (shippingError) {
          console.error('Error updating shipping cost:', shippingError);
        } else {
          console.log('Updated shipping cost in database');
        }
      }

      // Add shipping cost
      const calculatedTotal = calculatedSubtotal + calculatedShippingCost;

      // Compare with actual total to find discount
      const actualTotal = existingOrder.amount_total;
      const discrepancy = calculatedTotal - actualTotal;

      if (discrepancy > 0) {
        console.log(`Found discrepancy of ${discrepancy} cents, likely a discount`);

        // Check for common discount percentages (10%, 20%, etc.)
        let matchedPercentage = 0;

        // Try to match common discount percentages
        const commonPercentages = [10, 15, 20, 25, 30, 40, 50];
        for (const percentage of commonPercentages) {
          const expectedDiscount = (calculatedSubtotal * percentage) / 100;
          // Allow for small differences (within 10 cents)
          if (Math.abs(expectedDiscount - discrepancy) <= 10) {
            matchedPercentage = percentage;
            console.log(`Matched to common discount percentage: ${percentage}%`);
            break;
          }
        }

        // If no common percentage matched, calculate it precisely
        if (matchedPercentage === 0) {
          matchedPercentage = Math.round((discrepancy / calculatedSubtotal) * 100);
          console.log(`Calculated custom discount percentage: ${matchedPercentage}%`);
        }

        finalDiscountAmount = discrepancy;
        finalDiscountType = 'percentage';
        finalDiscountPercentage = matchedPercentage;

        console.log('Calculated discount:', {
          discount_amount: finalDiscountAmount,
          discount_type: finalDiscountType,
          discount_percentage: finalDiscountPercentage
        });
      }
    }

    // Update the order with the discount information
    const { error: updateError } = await supabase
      .from('stripe_orders')
      .update({
        discount_amount: finalDiscountAmount,
        discount_type: finalDiscountType,
        discount_percentage: finalDiscountPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return corsResponse({ error: 'Failed to update order', details: updateError }, 500);
    }

    console.log('Successfully updated order with discount information');

    return corsResponse({
      success: true,
      message: 'Order updated with discount information',
      discount: {
        amount: finalDiscountAmount,
        type: finalDiscountType,
        percentage: finalDiscountPercentage
      }
    });
  } catch (error) {
    console.error('Error updating discount:', error);
    return corsResponse({ error: 'Internal server error', details: error }, 500);
  }
});
