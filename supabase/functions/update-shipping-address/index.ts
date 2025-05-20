import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Helper function for CORS responses
function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return corsResponse({});
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return corsResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { paymentIntentId, shippingAddress } = await req.json();

    if (!paymentIntentId) {
      return corsResponse({ error: 'Payment intent ID is required' }, 400);
    }

    if (!shippingAddress) {
      return corsResponse({ error: 'Shipping address is required' }, 400);
    }

    // Special case for 'latest' - update all recent orders
    if (paymentIntentId === 'latest') {
      console.log('Special case: Updating all recent orders with this shipping address');

      try {
        // Get all recent orders (last 5)
        const { data: recentOrders, error: recentOrdersError } = await supabase
          .from('stripe_orders')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentOrdersError) {
          console.error('Error finding recent orders:', recentOrdersError);
          return corsResponse({ error: 'Failed to find recent orders', details: recentOrdersError }, 500);
        }

        if (!recentOrders || recentOrders.length === 0) {
          console.log('No recent orders found');
          return corsResponse({ error: 'No recent orders found' }, 404);
        }

        console.log(`Found ${recentOrders.length} recent orders to update`);

        // Format the shipping address
        const formattedAddress = {
          name: shippingAddress.name,
          line1: shippingAddress.address.line1,
          line2: shippingAddress.address.line2 || null,
          city: shippingAddress.address.city,
          state: shippingAddress.address.state,
          postal_code: shippingAddress.address.postal_code,
          country: shippingAddress.address.country,
          phone: shippingAddress.phone
        };

        // Update all recent orders with this shipping address
        for (const order of recentOrders) {
          console.log(`Updating order ${order.id} with shipping address`);

          const { error: updateError } = await supabase
            .from('stripe_orders')
            .update({
              shipping_address: formattedAddress,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`Error updating order ${order.id}:`, updateError);
          } else {
            console.log(`Successfully updated order ${order.id}`);
          }
        }

        return corsResponse({
          success: true,
          message: `Updated ${recentOrders.length} recent orders with shipping address`
        });
      } catch (error) {
        console.error('Error updating recent orders:', error);
        return corsResponse({ error: 'Failed to update recent orders', details: error }, 500);
      }
    }

    console.log(`Updating shipping address for payment intent: ${paymentIntentId}`);
    console.log('Shipping address:', JSON.stringify(shippingAddress, null, 2));

    // First, check if the order exists
    const { data: existingOrder, error: findError } = await supabase
      .from('stripe_orders')
      .select('id, shipping_address')
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding order:', findError);
      return corsResponse({ error: 'Failed to find order', details: findError }, 500);
    }

    if (!existingOrder) {
      console.log('No order found for payment intent:', paymentIntentId);
      return corsResponse({ error: 'Order not found' }, 404);
    }

    console.log('Found order:', existingOrder.id);
    console.log('Current shipping address:', existingOrder.shipping_address);

    // Force update all orders with this shipping address to ensure it's properly saved
    try {
      console.log('Force updating all orders with this shipping address');

      // Get all orders for this user
      const { data: userOrders, error: userOrdersError } = await supabase
        .from('stripe_orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (userOrdersError) {
        console.error('Error finding user orders:', userOrdersError);
      } else if (userOrders && userOrders.length > 0) {
        console.log(`Found ${userOrders.length} recent orders to update`);

        // Update all recent orders with this shipping address
        for (const order of userOrders) {
          console.log(`Updating order ${order.id} with shipping address`);

          const { error: updateAllError } = await supabase
            .from('stripe_orders')
            .update({
              shipping_address: shippingAddress,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateAllError) {
            console.error(`Error updating order ${order.id}:`, updateAllError);
          } else {
            console.log(`Successfully updated order ${order.id}`);
          }
        }
      }
    } catch (forceUpdateError) {
      console.error('Error force updating orders:', forceUpdateError);
    }

    // Format the shipping address
    const formattedAddress = {
      name: shippingAddress.name,
      line1: shippingAddress.address.line1,
      line2: shippingAddress.address.line2 || null,
      city: shippingAddress.address.city,
      state: shippingAddress.address.state,
      postal_code: shippingAddress.address.postal_code,
      country: shippingAddress.address.country,
      phone: shippingAddress.phone
    };

    // Update the order with the shipping address
    const { error: updateError } = await supabase
      .from('stripe_orders')
      .update({
        shipping_address: formattedAddress,
        shipping_cost: 500, // $5.00 in cents
        updated_at: new Date().toISOString()
      })
      .eq('id', existingOrder.id);

    if (updateError) {
      console.error('Error updating order with shipping address:', updateError);

      // Try a second approach with RPC
      try {
        const jsonString = JSON.stringify(formattedAddress).replace(/'/g, "''");
        const { error: rpcError } = await supabase.rpc('execute_sql', {
          sql_query: `UPDATE stripe_orders
                      SET shipping_address = '${jsonString}'::jsonb,
                          shipping_cost = 500,
                          updated_at = '${new Date().toISOString()}'
                      WHERE id = '${existingOrder.id}'`
        });

        if (rpcError) {
          console.error('Error with RPC update:', rpcError);
          return corsResponse({ error: 'Failed to update order with RPC', details: rpcError }, 500);
        } else {
          console.log('Successfully updated order with RPC');
        }
      } catch (rpcException) {
        console.error('Exception with RPC update:', rpcException);
        return corsResponse({ error: 'Exception during RPC update', details: rpcException }, 500);
      }
    } else {
      console.log('Successfully updated order with shipping address');
    }

    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('stripe_orders')
      .select('shipping_address')
      .eq('id', existingOrder.id)
      .single();

    if (verifyError) {
      console.error('Error verifying order update:', verifyError);
    } else {
      console.log('Verified shipping address in database:', JSON.stringify(verifyData.shipping_address, null, 2));
    }

    return corsResponse({
      success: true,
      message: 'Shipping address updated successfully',
      orderId: existingOrder.id
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return corsResponse({ error: 'Internal server error', details: error }, 500);
  }
});
