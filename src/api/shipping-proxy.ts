// Local proxy for shipping configuration and address updates to avoid CORS issues
import { supabase } from '../lib/supabase';

// Default shipping configuration - matches the migration and admin defaults
const DEFAULT_CONFIG = {
  base_shipping_cost: 500, // $5.00 in cents (matches migration default)
  additional_item_cost: 250, // $2.50 in cents (matches admin settings default)
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
 * Get shipping configuration from Supabase function
 */
export async function getShippingConfig() {
  try {
    console.log('Local proxy - Fetching shipping config from Supabase function');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shipping-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch shipping configuration');
    }

    const data = await response.json();
    console.log('Local proxy - Fetched shipping config:', data);

    return {
      base_shipping_cost: data.base_shipping_cost,
      additional_item_cost: data.additional_item_cost,
      source: data.source || 'supabase-function'
    };
  } catch (error) {
    console.error('Local proxy - Error fetching shipping config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
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
