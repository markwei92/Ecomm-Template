// Script to check user data tables and connections
// Run with: node check-user-data.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing required environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserData() {
  console.log('🔍 Checking user data tables and connections...');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check which address tables exist
    console.log('1. Checking address tables...');
    
    // Check addresses table
    const { data: addressesData, error: addressesError } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .limit(5);

    if (addressesError) {
      console.log('   ❌ addresses table error:', addressesError.message);
    } else {
      console.log(`   ✅ addresses table exists with ${addressesData.length} records`);
      if (addressesData.length > 0) {
        console.log('   📄 Sample addresses record:', addressesData[0]);
      }
    }

    // Check user_addresses table
    const { data: userAddressesData, error: userAddressesError } = await supabaseAdmin
      .from('user_addresses')
      .select('*')
      .limit(5);

    if (userAddressesError) {
      console.log('   ❌ user_addresses table error:', userAddressesError.message);
    } else {
      console.log(`   ✅ user_addresses table exists with ${userAddressesData.length} records`);
      if (userAddressesData.length > 0) {
        console.log('   📄 Sample user_addresses record:', userAddressesData[0]);
      }
    }

    // Step 2: Check stripe_orders table
    console.log('\n2. Checking orders table...');
    
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('stripe_orders')
      .select('*')
      .limit(5);

    if (ordersError) {
      console.log('   ❌ stripe_orders table error:', ordersError.message);
    } else {
      console.log(`   ✅ stripe_orders table exists with ${ordersData.length} records`);
      if (ordersData.length > 0) {
        console.log('   📄 Sample order record:', ordersData[0]);
        console.log('   👥 User IDs in orders:', ordersData.map(order => order.user_id));
      }
    }

    // Step 3: Check auth.users table
    console.log('\n3. Checking auth users...');
    
    const { data: usersData, error: usersError } = await supabaseAdmin
      .rpc('get_auth_user_details', { user_email: 'test2@test2.com' });

    if (usersError) {
      console.log('   ❌ Error getting user details:', usersError.message);
    } else {
      console.log('   ✅ User details found:', usersData);
    }

    // Step 4: Check profiles table
    console.log('\n4. Checking profiles table...');
    
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      console.log('   ❌ profiles table error:', profilesError.message);
    } else {
      console.log(`   ✅ profiles table exists with ${profilesData.length} records`);
      if (profilesData.length > 0) {
        console.log('   📄 Sample profile record:', profilesData[0]);
      }
    }

    // Step 5: Check for specific user data
    console.log('\n5. Checking specific user data...');
    
    // Get test2@test2.com user ID
    if (usersData && usersData.exists) {
      const userId = usersData.id;
      console.log(`   🔍 Checking data for user ID: ${userId}`);

      // Check addresses for this user
      const { data: userSpecificAddresses, error: userAddressError } = await supabaseAdmin
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId);

      if (userAddressError) {
        console.log('   ❌ Error getting user addresses:', userAddressError.message);
      } else {
        console.log(`   📍 User has ${userSpecificAddresses.length} addresses in user_addresses table`);
      }

      // Check addresses in the other table
      const { data: userSpecificAddresses2, error: userAddressError2 } = await supabaseAdmin
        .from('addresses')
        .select('*')
        .eq('user_id', userId);

      if (userAddressError2) {
        console.log('   ❌ Error getting user addresses from addresses table:', userAddressError2.message);
      } else {
        console.log(`   📍 User has ${userSpecificAddresses2.length} addresses in addresses table`);
      }

      // Check orders for this user
      const { data: userSpecificOrders, error: userOrderError } = await supabaseAdmin
        .from('stripe_orders')
        .select('*')
        .eq('user_id', userId);

      if (userOrderError) {
        console.log('   ❌ Error getting user orders:', userOrderError.message);
      } else {
        console.log(`   📦 User has ${userSpecificOrders.length} orders`);
        if (userSpecificOrders.length > 0) {
          console.log('   📄 User order sample:', userSpecificOrders[0]);
        }
      }

      // Check profile for this user
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.log('   ❌ Error getting user profile:', profileError.message);
      } else {
        console.log('   👤 User profile found:', userProfile);
      }
    }

    // Step 6: Check table schemas
    console.log('\n6. Checking table schemas...');
    
    // Get addresses table schema
    const { data: addressesSchema, error: addressesSchemaError } = await supabaseAdmin
      .rpc('get_table_schema', { table_name: 'addresses' });

    if (!addressesSchemaError && addressesSchema) {
      console.log('   📋 addresses table columns:', addressesSchema);
    }

    // Get user_addresses table schema
    const { data: userAddressesSchema, error: userAddressesSchemaError } = await supabaseAdmin
      .rpc('get_table_schema', { table_name: 'user_addresses' });

    if (!userAddressesSchemaError && userAddressesSchema) {
      console.log('   📋 user_addresses table columns:', userAddressesSchema);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('📋 SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('🔧 RECOMMENDATIONS:');
    console.log('1. AccountPage.tsx uses "addresses" table');
    console.log('2. AddressForm.tsx uses "user_addresses" table');
    console.log('3. Need to standardize on one table');
    console.log('4. Check which table has the actual data');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the check
checkUserData().then(() => {
  console.log('\n🏁 User data check completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
