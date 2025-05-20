// Local proxy for shipping configuration and address updates to avoid CORS issues
import { supabase } from '../lib/supabase';

// Default shipping configuration
const DEFAULT_CONFIG = {
  base_shipping_cost: 400, // $4.00 in cents
  additional_item_cost: 100, // $1.00 in cents
  source: 'local-fallback'
};

/**
 * Update shipping address for recent orders
 * This bypasses the Supabase Edge Function to avoid CORS issues
 */
export async function updateShippingAddress(shippingAddress: any) {
  try {
    console.log('Local proxy - Updating shipping address for recent orders');

    // Get recent orders (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentOrders, error: fetchError } = await supabase
      .from('stripe_orders')
      .select('id')
      .gt('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('Local proxy - Error fetching recent orders:', fetchError);
      return { success: false, error: 'Failed to fetch recent orders' };
    }

    if (!recentOrders || recentOrders.length === 0) {
      console.log('Local proxy - No recent orders found to update');
      return { success: true, message: 'No recent orders found to update', updated: 0 };
    }

    console.log(`Local proxy - Found ${recentOrders.length} recent orders to update`);

    // Update each order with the shipping address
    const updatePromises = recentOrders.map(order =>
      supabase
        .from('stripe_orders')
        .update({ shipping_address: shippingAddress })
        .eq('id', order.id)
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Local proxy - Errors updating some orders:', errors);
      return {
        success: true,
        message: `Updated ${results.length - errors.length} of ${results.length} orders`,
        errors: errors.map(e => e.error)
      };
    }

    console.log(`Local proxy - Successfully updated ${results.length} orders`);
    return { success: true, updated: results.length };
  } catch (error) {
    console.error('Local proxy - Exception updating shipping address:', error);
    return { success: false, error: 'Exception updating shipping address' };
  }
}

/**
 * Get shipping configuration
 * This function no longer tries to access the database and just returns default values
 */
export async function getShippingConfig() {
  console.log('Local proxy - Using hardcoded shipping config');

  // Just return the default config directly
  return DEFAULT_CONFIG;
}

/**
 * Calculate shipping cost based on item quantity and configuration
 */
export function calculateShippingCost(quantity: number, config = DEFAULT_CONFIG) {
  let shippingCost = config.base_shipping_cost;

  if (quantity > 1) {
    shippingCost = config.base_shipping_cost + ((quantity - 1) * config.additional_item_cost);
  }

  return shippingCost;
}
