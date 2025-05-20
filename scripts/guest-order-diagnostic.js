// Guest Order Diagnostic Tool
// This script helps diagnose issues with the guest order system

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase clients
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Create a log file
const logFile = `guest-order-diagnostic-${new Date().toISOString().replace(/:/g, '-')}.log`;
const logger = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logger.write(formattedMessage + '\n');
}

async function runDiagnostic() {
  log('Starting Guest Order System Diagnostic');
  log('=====================================');
  
  // Step 1: Check database connection
  log('\n1. Checking database connection...');
  try {
    const { data, error } = await supabase.from('stripe_orders').select('count');
    if (error) throw error;
    log('✅ Database connection successful');
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`);
    return;
  }
  
  // Step 2: Check if the guest user exists
  log('\n2. Checking if guest user exists...');
  try {
    const { data, error } = await supabaseAdmin.rpc('check_user_exists', {
      user_id: '00000000-0000-0000-0000-000000000001'
    });
    
    if (error) {
      log(`❌ Error checking guest user: ${error.message}`);
      log('Creating RPC function for checking user existence...');
      
      // Create the function if it doesn't exist
      const { error: createError } = await supabaseAdmin.rpc('execute_sql', {
        sql_query: `
          CREATE OR REPLACE FUNCTION check_user_exists(user_id UUID)
          RETURNS BOOLEAN
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            user_exists BOOLEAN;
          BEGIN
            SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
            RETURN user_exists;
          END;
          $$;
        `
      });
      
      if (createError) {
        log(`❌ Failed to create check_user_exists function: ${createError.message}`);
      } else {
        log('✅ Created check_user_exists function');
        
        // Try again
        const { data: retryData, error: retryError } = await supabaseAdmin.rpc('check_user_exists', {
          user_id: '00000000-0000-0000-0000-000000000001'
        });
        
        if (retryError) {
          log(`❌ Error checking guest user after creating function: ${retryError.message}`);
        } else if (retryData) {
          log('✅ Guest user exists');
        } else {
          log('❌ Guest user does not exist');
          log('Creating guest user...');
          
          // Create the guest user
          const { error: createUserError } = await supabaseAdmin.rpc('execute_sql', {
            sql_query: `
              INSERT INTO auth.users (id, email, created_at, updated_at)
              VALUES ('00000000-0000-0000-0000-000000000001', 'guest@example.com', NOW(), NOW())
              ON CONFLICT (id) DO NOTHING;
            `
          });
          
          if (createUserError) {
            log(`❌ Failed to create guest user: ${createUserError.message}`);
          } else {
            log('✅ Created guest user');
          }
        }
      }
    } else if (data) {
      log('✅ Guest user exists');
    } else {
      log('❌ Guest user does not exist');
      log('Creating guest user...');
      
      // Create the guest user
      const { error: createUserError } = await supabaseAdmin.rpc('execute_sql', {
        sql_query: `
          INSERT INTO auth.users (id, email, created_at, updated_at)
          VALUES ('00000000-0000-0000-0000-000000000001', 'guest@example.com', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `
      });
      
      if (createUserError) {
        log(`❌ Failed to create guest user: ${createUserError.message}`);
      } else {
        log('✅ Created guest user');
      }
    }
  } catch (error) {
    log(`❌ Unexpected error checking guest user: ${error.message}`);
  }
  
  // Step 3: Check RLS policies
  log('\n3. Checking RLS policies...');
  try {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: "SELECT * FROM pg_policies WHERE tablename = 'stripe_orders'"
    });
    
    if (error) {
      log(`❌ Error checking RLS policies: ${error.message}`);
    } else if (data) {
      log('Found the following RLS policies:');
      
      // Parse the result
      const policies = JSON.parse(data);
      
      // Check for specific policies
      const guestInsertPolicy = policies.find(p => 
        p.cmd === 'INSERT' && p.policyname.toLowerCase().includes('guest')
      );
      
      const guestSelectPolicy = policies.find(p => 
        p.cmd === 'SELECT' && p.policyname.toLowerCase().includes('guest')
      );
      
      if (guestInsertPolicy) {
        log(`✅ Found guest insert policy: "${guestInsertPolicy.policyname}"`);
      } else {
        log('❌ No guest insert policy found');
        log('Creating guest insert policy...');
        
        const { error: createPolicyError } = await supabaseAdmin.rpc('execute_sql', {
          sql_query: `
            CREATE POLICY "Allow inserting guest orders" 
            ON stripe_orders 
            FOR INSERT TO public 
            WITH CHECK (is_guest = true);
          `
        });
        
        if (createPolicyError) {
          log(`❌ Failed to create guest insert policy: ${createPolicyError.message}`);
        } else {
          log('✅ Created guest insert policy');
        }
      }
      
      if (guestSelectPolicy) {
        log(`✅ Found guest select policy: "${guestSelectPolicy.policyname}"`);
      } else {
        log('❌ No guest select policy found');
        log('Creating guest select policy...');
        
        const { error: createPolicyError } = await supabaseAdmin.rpc('execute_sql', {
          sql_query: `
            CREATE POLICY "Allow viewing guest orders" 
            ON stripe_orders 
            FOR SELECT TO public 
            USING (is_guest = true);
          `
        });
        
        if (createPolicyError) {
          log(`❌ Failed to create guest select policy: ${createPolicyError.message}`);
        } else {
          log('✅ Created guest select policy');
        }
      }
    }
  } catch (error) {
    log(`❌ Unexpected error checking RLS policies: ${error.message}`);
  }
  
  // Step 4: Test guest order insertion
  log('\n4. Testing guest order insertion...');
  try {
    const testOrder = {
      payment_intent_id: 'diagnostic_test_' + Date.now(),
      is_guest: true,
      user_id: '00000000-0000-0000-0000-000000000001',
      customer_id: 'cus_guest_diagnostic',
      amount_total: 1000,
      currency: 'usd',
      status: 'completed',
      payment_status: 'succeeded',
      items: [{ id: 'test', title: 'Diagnostic Test Product', quantity: 1, price: 1000 }],
      shipping_address: { 
        name: 'Diagnostic Test', 
        line1: '123 Test St', 
        city: 'Testville', 
        state: 'TS',
        postal_code: '12345', 
        country: 'US' 
      },
      shipping_cost: 400,
      created_at: new Date().toISOString()
    };
    
    // Try with anon key first
    const { data: anonData, error: anonError } = await supabase
      .from('stripe_orders')
      .insert(testOrder)
      .select();
    
    if (anonError) {
      log(`❌ Failed to insert test order with anon key: ${anonError.message}`);
      log('Trying with service role key...');
      
      // Try with service role key
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('stripe_orders')
        .insert(testOrder)
        .select();
      
      if (adminError) {
        log(`❌ Failed to insert test order with service role key: ${adminError.message}`);
      } else {
        log('✅ Inserted test order with service role key');
        log('❌ Guest order insertion with anon key is not working');
        log('This suggests an issue with the RLS policies');
      }
    } else {
      log('✅ Successfully inserted test order with anon key');
      log('✅ Guest order insertion is working correctly');
      
      // Try to retrieve the order
      const { data: retrieveData, error: retrieveError } = await supabase
        .from('stripe_orders')
        .select('*')
        .eq('payment_intent_id', testOrder.payment_intent_id)
        .single();
      
      if (retrieveError) {
        log(`❌ Failed to retrieve test order with anon key: ${retrieveError.message}`);
        log('This suggests an issue with the RLS select policy');
      } else {
        log('✅ Successfully retrieved test order with anon key');
        log('✅ Guest order retrieval is working correctly');
      }
    }
  } catch (error) {
    log(`❌ Unexpected error testing guest order insertion: ${error.message}`);
  }
  
  log('\nDiagnostic complete. Check the log file for details: ' + logFile);
  logger.end();
}

runDiagnostic().catch(error => {
  log(`Fatal error: ${error.message}`);
  logger.end();
});
