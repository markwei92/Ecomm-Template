// Simple script to test guest order insertion
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://rtwbnoblnlbnxdnuacak.supabase.co';
// Use the anon key from the .env file
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMTEzNDIsImV4cCI6MjA2Mjg4NzM0Mn0.PmA3i7r5ziy0j6_JjrL2_KYlbq46qaQGACHP1mG5944';
// Use the service role key from the .env file
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2Jub2JsbmxibnhkbnVhY2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxMTM0MiwiZXhwIjoyMDYyODg3MzQyfQ.g2vtZrwh8bsNrNVkQ4UbvLshfPQYdBej3NkrU28JpPA';

// Create two clients - one with anon key and one with service role key
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testGuestOrderInsertion() {
  try {
    console.log('Starting guest order insertion test...');

    // Create a test guest order
    const testOrder = {
      payment_intent_id: 'test_guest_' + Date.now(),
      is_guest: true,
      user_id: '00000000-0000-0000-0000-000000000001', // Guest user ID
      customer_id: 'cus_guest_test',
      amount_total: 1000, // $10.00
      currency: 'usd',
      status: 'completed',
      payment_status: 'succeeded',
      items: [{ id: 'test', title: 'Test Product', quantity: 1, price: 1000 }],
      shipping_address: {
        name: 'Test Guest',
        line1: '123 Test St',
        city: 'Testville',
        state: 'TS',
        postal_code: '12345',
        country: 'US'
      },
      shipping_cost: 400, // $4.00
      created_at: new Date().toISOString()
    };

    // Log the test order
    console.log('Attempting to insert test guest order with anon key:', testOrder);

    // Try to insert with anon key first
    const { data: anonData, error: anonError } = await supabase
      .from('stripe_orders')
      .insert(testOrder)
      .select();

    if (anonError) {
      console.error('Error inserting test guest order with anon key:', anonError);
      console.log('Now trying with service role key...');

      // Try with service role key
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('stripe_orders')
        .insert(testOrder)
        .select();

      if (adminError) {
        console.error('Error inserting test guest order with service role key:', adminError);
        return;
      }

      console.log('Test guest order inserted successfully with service role key:', adminData);

      // Try to retrieve the order with anon key to test RLS
      console.log('Now trying to retrieve the order with anon key to test RLS...');
      const { data: retrievedOrder, error: retrieveError } = await supabase
        .from('stripe_orders')
        .select('*')
        .eq('payment_intent_id', testOrder.payment_intent_id)
        .single();

      if (retrieveError) {
        console.error('Error retrieving the inserted order with anon key:', retrieveError);
        console.log('This suggests RLS is preventing guest users from viewing orders.');
      } else {
        console.log('Successfully retrieved the inserted order with anon key:', retrievedOrder);
        console.log('This suggests RLS is correctly configured for guest orders.');
      }
    } else {
      console.log('Test guest order inserted successfully with anon key:', anonData);
      console.log('This suggests RLS is correctly configured for guest orders.');

      // Try to retrieve the order to confirm it was inserted
      const { data: retrievedOrder, error: retrieveError } = await supabase
        .from('stripe_orders')
        .select('*')
        .eq('payment_intent_id', testOrder.payment_intent_id)
        .single();

      if (retrieveError) {
        console.error('Error retrieving the inserted order:', retrieveError);
      } else {
        console.log('Successfully retrieved the inserted order:', retrievedOrder);
      }
    }

    console.log('Test completed!');
  } catch (err) {
    console.error('Unexpected error during test:', err);
  }
}

// Run the test
testGuestOrderInsertion();
