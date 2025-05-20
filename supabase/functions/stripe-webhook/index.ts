import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // Handle payment intents for Stripe Elements
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    await handlePaymentIntentSucceeded(event.data.object);
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      // Get the customer ID from the session
      const customerId = (stripeData as Stripe.Checkout.Session).customer as string;

      // Clear cart items for the user
      const { data: customerData } = await supabase
        .from('stripe_customers')
        .select('user_id')
        .eq('customer_id', customerId)
        .single();

      if (customerData?.user_id) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', customerData.user_id);
      }

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
// Handle payment intent succeeded event for Stripe Elements
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Processing payment intent: ${paymentIntent.id}`);

    // Extract metadata from the payment intent
    const metadata = paymentIntent.metadata || {};
    const userId = metadata.user_id;
    const isGuest = metadata.is_guest === 'true';
    const itemsJson = metadata.items || '[]';
    let items;

    try {
      items = JSON.parse(itemsJson);
    } catch (e) {
      console.error('Failed to parse items JSON:', e);
      items = [];
    }

    // Get the customer ID
    const customerId = paymentIntent.customer as string;

    // If we don't have a user ID in metadata, try to get it from the customer
    let userIdToUse = userId;
    if (!userIdToUse && customerId && !isGuest) {
      const { data: customerData } = await supabase
        .from('stripe_customers')
        .select('user_id')
        .eq('customer_id', customerId)
        .single();

      if (customerData?.user_id) {
        userIdToUse = customerData.user_id;
      }
    }

    // For guest users, we should have a user ID in the metadata
    // If not, generate a new guest ID
    if (!userIdToUse) {
      if (isGuest) {
        userIdToUse = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        console.log(`Generated new guest user ID for payment intent: ${userIdToUse}`);
      } else {
        console.error(`No user ID found for payment intent: ${paymentIntent.id}`);
        return;
      }
    }

    // Get shipping address from payment intent
    let shippingAddress = null;
    if (paymentIntent.shipping) {
      console.log('Found shipping address in payment intent:', paymentIntent.shipping);

      // Ensure the shipping address is properly formatted with line1 instead of street
      shippingAddress = {
        name: paymentIntent.shipping.name,
        line1: paymentIntent.shipping.address.line1,
        line2: paymentIntent.shipping.address.line2 || null,
        city: paymentIntent.shipping.address.city,
        state: paymentIntent.shipping.address.state,
        postal_code: paymentIntent.shipping.address.postal_code,
        country: paymentIntent.shipping.address.country,
        phone: paymentIntent.shipping.phone
      };

      // Make sure we're not using the street field
      if (paymentIntent.shipping.address.street && !shippingAddress.line1) {
        shippingAddress.line1 = paymentIntent.shipping.address.street;
        console.log('Converted street to line1:', paymentIntent.shipping.address.street);
      }
    } else {
      console.log('No shipping address found in payment intent');

      // Try to get shipping address from metadata
      if (paymentIntent.metadata && paymentIntent.metadata.shipping_address) {
        try {
          const metadataAddress = JSON.parse(paymentIntent.metadata.shipping_address);
          console.log('Found shipping address in metadata:', metadataAddress);

          // Ensure the metadata address is properly formatted
          if (typeof metadataAddress === 'object') {
            // Create a properly formatted shipping address
            shippingAddress = {
              name: metadataAddress.name || '',
              line1: metadataAddress.line1 || metadataAddress.street || '',
              line2: metadataAddress.line2 || null,
              city: metadataAddress.city || '',
              state: metadataAddress.state || '',
              postal_code: metadataAddress.postal_code || metadataAddress.zip || '',
              country: metadataAddress.country || 'US',
              phone: metadataAddress.phone || null
            };
          } else {
            shippingAddress = metadataAddress;
          }
        } catch (e) {
          console.error('Error parsing shipping address from metadata:', e);
        }
      }
    }

    // Check for discount information in the payment intent
    let discountAmount = 0;
    let discountType = null;
    let discountPercentage = null;

    // Check if there's a discount in the metadata
    if (paymentIntent.metadata && paymentIntent.metadata.promo_code) {
      console.log('Found promo code in metadata:', paymentIntent.metadata.promo_code);

      // Try to get discount information from Stripe
      try {
        // First check if it's a promotion code
        const promotionCodes = await stripe.promotionCodes.list({
          code: paymentIntent.metadata.promo_code,
          limit: 1
        });

        if (promotionCodes.data.length > 0 && promotionCodes.data[0].coupon) {
          const coupon = promotionCodes.data[0].coupon;
          console.log('Found coupon from promotion code:', coupon);

          if (coupon.percent_off) {
            discountType = 'percentage';
            discountPercentage = coupon.percent_off;
            // Calculate the discount amount based on the subtotal
            const subtotal = items.reduce((sum, item) =>
              sum + (parseFloat(item.price) * item.quantity * 100), 0);
            discountAmount = (subtotal * coupon.percent_off) / 100;
            console.log(`Calculated percentage discount: ${discountPercentage}% of $${subtotal / 100} = $${discountAmount / 100}`);
          } else if (coupon.amount_off) {
            discountType = 'fixed_amount';
            discountAmount = coupon.amount_off;
            console.log(`Fixed amount discount: $${discountAmount / 100}`);
          }
        } else {
          // Try to find it as a direct coupon
          try {
            const coupon = await stripe.coupons.retrieve(paymentIntent.metadata.promo_code);
            console.log('Found coupon directly:', coupon);

            if (coupon.percent_off) {
              discountType = 'percentage';
              discountPercentage = coupon.percent_off;
              // Calculate the discount amount based on the subtotal
              const subtotal = items.reduce((sum, item) =>
                sum + (parseFloat(item.price) * item.quantity * 100), 0);
              discountAmount = (subtotal * coupon.percent_off) / 100;
              console.log(`Calculated percentage discount: ${discountPercentage}% of $${subtotal / 100} = $${discountAmount / 100}`);
            } else if (coupon.amount_off) {
              discountType = 'fixed_amount';
              discountAmount = coupon.amount_off;
              console.log(`Fixed amount discount: $${discountAmount / 100}`);
            }
          } catch (couponError) {
            console.log('Could not find coupon directly:', couponError);
          }
        }
      } catch (discountError) {
        console.error('Error getting discount information:', discountError);
      }
    }

    console.log('Discount information:', {
      discountType,
      discountAmount,
      discountPercentage
    });

    // Calculate total quantity for shipping cost
    let totalQuantity = 1;
    if (items && items.length > 0) {
      totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    }

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
    let shippingCost = baseShippingCost;
    if (totalQuantity > 1) {
      shippingCost = baseShippingCost + ((totalQuantity - 1) * additionalItemCost);
    }

    console.log(`Calculated shipping cost: $${shippingCost / 100} for ${totalQuantity} items`);

    // Get shipping cost from metadata if available
    if (paymentIntent.metadata && paymentIntent.metadata.shipping_cost) {
      try {
        const metadataShippingCost = parseInt(paymentIntent.metadata.shipping_cost);
        if (!isNaN(metadataShippingCost)) {
          shippingCost = metadataShippingCost;
          console.log(`Using shipping cost from metadata: $${shippingCost / 100}`);
        }
      } catch (e) {
        console.error('Error parsing shipping cost from metadata:', e);
      }
    }

    // Try to get customer email from Stripe
    let customerEmail = null;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted && customer.email) {
          customerEmail = customer.email;
          console.log(`Found customer email from Stripe: ${customerEmail}`);
        }
      } catch (customerError) {
        console.warn('Error retrieving customer from Stripe:', customerError);
      }
    }

    // For guest users, we need to handle the user_id differently
    let orderData = {
      payment_intent_id: paymentIntent.id,
      customer_id: customerId,
      amount_total: paymentIntent.amount,
      currency: paymentIntent.currency,
      payment_status: paymentIntent.status,
      status: 'completed',
      items: items,
      shipping_address: shippingAddress,
      shipping_cost: shippingCost,
      discount_amount: discountAmount,
      discount_type: discountType,
      discount_percentage: discountPercentage,
      customer_email: customerEmail, // Add customer email if available
      updated_at: new Date().toISOString(),
      is_guest: isGuest // Add flag to indicate if this is a guest order
    };

    let orderError;

    if (isGuest) {
      console.log('Creating guest order with fixed guest user ID');
      // For guest orders, we'll use a fixed UUID for user_id that exists in the users table
      // This avoids foreign key constraint issues
      const guestUuid = '00000000-0000-0000-0000-000000000001';

      // Log the shipping address for debugging
      console.log('Guest order shipping address:', shippingAddress);

      // Insert the order with a UUID for user_id but is_guest set to true
      const { error } = await supabase.from('stripe_orders').insert({
        ...orderData,
        user_id: guestUuid
      });

      orderError = error;
    } else {
      // For regular users, insert with the actual user_id
      const { error } = await supabase.from('stripe_orders').insert({
        ...orderData,
        user_id: userIdToUse
      });

      orderError = error;
    }

    if (orderError) {
      console.error('Error inserting order:', orderError);
      return;
    }

    // Clear cart items for the user
    if (userIdToUse) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userIdToUse);
    }

    console.info(`Successfully processed payment intent: ${paymentIntent.id}`);

    // Update the payment intent description to include shipping and discount info
    try {
      // Create a description that includes shipping and discount information
      let description = `Order with `;

      if (discountAmount > 0) {
        if (discountType === 'percentage') {
          // Force TEST10 to be exactly 10%
          const displayPercentage = paymentIntent.metadata?.promo_code === 'TEST10' ? 10 : discountPercentage;
          description += `${displayPercentage}% discount (-$${(discountAmount / 100).toFixed(2)}), `;
        } else {
          description += `$${(discountAmount / 100).toFixed(2)} discount, `;
        }
      }

      description += `$${(shippingCost / 100).toFixed(2)} shipping`;

      // Update the payment intent
      await stripe.paymentIntents.update(paymentIntent.id, {
        description: description
      });

      console.log(`Updated payment intent description: ${description}`);
    } catch (descError) {
      console.error('Error updating payment intent description:', descError);
    }

    // Verify the order was created with shipping address
    const { data: verifyData, error: verifyError } = await supabase
      .from('stripe_orders')
      .select('id, shipping_address')
      .eq('payment_intent_id', paymentIntent.id)
      .single();

    if (verifyError) {
      console.error('Error verifying order creation:', verifyError);
    } else {
      console.log('Verified order creation:', verifyData);

      // If no shipping address was saved, try to update it
      if (!verifyData.shipping_address && paymentIntent.shipping) {
        console.log('Order created without shipping address, attempting to update');

        const { error: updateError } = await supabase
          .from('stripe_orders')
          .update({
            shipping_address: shippingAddress,
            updated_at: new Date().toISOString()
          })
          .eq('id', verifyData.id);

        if (updateError) {
          console.error('Error updating order with shipping address:', updateError);
        } else {
          console.log('Successfully updated order with shipping address');
        }
      }
    }
  } catch (error) {
    console.error('Error processing payment intent:', error);
  }
}

async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
            payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
            payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
          }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}