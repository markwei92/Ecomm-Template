import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Starting guest order email test...');

  // Create a test guest order with email
  const testOrder = {
    payment_intent_id: `test_guest_${Date.now()}`,
    is_guest: true,
    user_id: '00000000-0000-0000-0000-000000000001',
    customer_id: 'cus_guest_test',
    amount_total: 1000,
    currency: 'usd',
    status: 'completed',
    payment_status: 'succeeded',
    items: [
      {
        id: 'test',
        title: 'Test Product',
        quantity: 1,
        price: 1000
      }
    ],
    shipping_address: {
      name: 'Test Guest',
      line1: '123 Test St',
      city: 'Testville',
      state: 'TS',
      postal_code: '12345',
      country: 'US',
      email: 'test.guest@example.com'
    },
    shipping_cost: 400,
    customer_email: 'test.guest@example.com',
    created_at: new Date().toISOString()
  };

  console.log('Attempting to insert test guest order with email:', testOrder);

  try {
    // Insert the test order using the service role key
    const { data, error } = await supabaseAdmin
      .from('stripe_orders')
      .insert(testOrder)
      .select();

    if (error) {
      console.error('Error inserting test guest order:', error);
    } else {
      console.log('Test guest order with email inserted successfully:', data);
    }

    // Try to retrieve the order to verify it was inserted
    const { data: retrievedOrder, error: retrieveError } = await supabaseAdmin
      .from('stripe_orders')
      .select('*')
      .eq('payment_intent_id', testOrder.payment_intent_id)
      .single();

    if (retrieveError) {
      console.error('Error retrieving the inserted order:', retrieveError);
    } else {
      console.log('Successfully retrieved the inserted order:', retrievedOrder);
    }
  } catch (error) {
    console.error('Exception during test:', error);
  }

  console.log('Test completed!');
}

main().catch(console.error);
