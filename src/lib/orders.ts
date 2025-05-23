import { supabase } from './supabase';

/**
 * Creates an order record in the database after a successful payment
 */
export async function debugStripeOrdersTable(): Promise<void> {
  try {
    console.log('Debugging stripe_orders table...');

    // Check if the table exists and what columns it has
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'stripe_orders' });

    if (tableError) {
      console.error('Error getting table info:', tableError);
    } else {
      console.log('Table info for stripe_orders:', tableInfo);
    }

    // Try to query the table
    const { data: orders, error: ordersError } = await supabase
      .from('stripe_orders')
      .select('*')
      .limit(5);

    if (ordersError) {
      console.error('Error querying stripe_orders:', ordersError);
    } else {
      console.log('Sample orders from stripe_orders:', orders);
    }

    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'stripe_orders' });

    if (policiesError) {
      console.error('Error getting policies:', policiesError);
    } else {
      console.log('Policies for stripe_orders:', policies);
    }
  } catch (error) {
    console.error('Error debugging stripe_orders table:', error);
  }
}

export async function createOrderFromPaymentIntent(
  paymentIntentId: string,
  amount: number,
  items: Array<{
    title: string;
    price: number;
    quantity: number;
  }>,
  discountInfo?: {
    discount_amount?: number;
    discount_type?: string;
    promo_code?: string;
    discount_percentage?: number | null;
  },
  shippingCost?: number
): Promise<{ id: string } | null> {
  try {
    console.log('Creating order for payment intent:', paymentIntentId);

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('No authenticated user found');
      return null;
    }

    console.log('User found:', user.id);

    // Create a simple customer ID if we don't have one
    const customerId = `cus_${user.id.substring(0, 8)}`;

    // Create the order data
    const orderData: any = {
      payment_intent_id: paymentIntentId,
      customer_id: customerId,
      user_id: user.id,
      amount_total: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_status: 'succeeded',
      status: 'completed',
      items: items
    };

    // Add discount information if provided
    if (discountInfo) {
      console.log('Adding discount information to order:', discountInfo);
      orderData.discount_amount = discountInfo.discount_amount || 0;
      orderData.discount_type = discountInfo.discount_type || null;
      orderData.promo_code = discountInfo.promo_code || null;
      orderData.discount_percentage = discountInfo.discount_percentage || null;
    }

    // Add shipping cost if provided
    if (shippingCost) {
      console.log('Adding shipping cost to order:', shippingCost);
      orderData.shipping_cost = Math.round(shippingCost * 100); // Convert to cents
    }

    console.log('Creating order with data:', orderData);

    // Insert the order
    const { data: order, error } = await supabase
      .from('stripe_orders')
      .insert(orderData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating order:', error);
      return null;
    }

    console.log('Order created successfully:', order);

    // Clear the cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    return order;
  } catch (error) {
    console.error('Error creating order:', error);
    return null;
  }
}
