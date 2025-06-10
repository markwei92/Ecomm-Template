// Script to test coupon creation directly in the database
// Run with: node scripts/test-coupon-creation.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCouponCreation() {
  console.log('🧪 Testing coupon creation...');

  try {
    // Test coupon data
    const testCoupon = {
      code: 'TESTCREATE25',
      type: 'percentage',
      amount: 25,
      valid_from: new Date().toISOString(),
      expires_at: null,
      usage_limit: 100,
      times_used: 0,
      stripe_id: `local_testcreate25_${Date.now()}`
    };

    console.log('📝 Creating test coupon:', testCoupon);

    // Check if coupon already exists
    const { data: existing } = await supabase
      .from('coupons')
      .select('code')
      .eq('code', testCoupon.code)
      .maybeSingle();

    if (existing) {
      console.log('⚠️  Test coupon already exists, deleting first...');
      await supabase
        .from('coupons')
        .delete()
        .eq('code', testCoupon.code);
    }

    // Create the coupon
    const { data, error } = await supabase
      .from('coupons')
      .insert(testCoupon)
      .select();

    if (error) {
      console.error('❌ Error creating coupon:', error);
      return false;
    }

    if (data && data.length > 0) {
      console.log('✅ Coupon created successfully:', {
        id: data[0].id,
        code: data[0].code,
        type: data[0].type,
        amount: data[0].amount
      });

      // Test validation of the created coupon
      console.log('\n🔍 Testing validation of created coupon...');

      const { data: validationData, error: validationError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', testCoupon.code)
        .maybeSingle();

      if (validationError) {
        console.error('❌ Error validating coupon:', validationError);
        return false;
      }

      if (validationData) {
        console.log('✅ Coupon validation successful:', {
          code: validationData.code,
          type: validationData.type,
          amount: validationData.amount,
          times_used: validationData.times_used,
          usage_limit: validationData.usage_limit
        });

        // Clean up - delete the test coupon
        console.log('\n🧹 Cleaning up test coupon...');
        const { error: deleteError } = await supabase
          .from('coupons')
          .delete()
          .eq('id', data[0].id);

        if (deleteError) {
          console.error('⚠️  Error deleting test coupon:', deleteError);
        } else {
          console.log('✅ Test coupon deleted successfully');
        }

        return true;
      } else {
        console.error('❌ Created coupon not found during validation');
        return false;
      }
    } else {
      console.error('❌ No data returned from coupon creation');
      return false;
    }

  } catch (error) {
    console.error('💥 Exception during coupon creation test:', error);
    return false;
  }
}

async function testDatabasePermissions() {
  console.log('🔐 Testing database permissions...');

  try {
    // Test read permissions
    const { data: readTest, error: readError } = await supabase
      .from('coupons')
      .select('id')
      .limit(1);

    if (readError) {
      console.error('❌ Read permission test failed:', readError);
      return false;
    }

    console.log('✅ Read permissions working');

    // Test write permissions with a simple insert/delete
    const testData = {
      code: 'PERMTEST',
      type: 'percentage',
      amount: 1,
      valid_from: new Date().toISOString(),
      expires_at: null,
      usage_limit: 1,
      times_used: 0,
      stripe_id: 'test_permission'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('coupons')
      .insert(testData)
      .select();

    if (insertError) {
      console.error('❌ Write permission test failed:', insertError);
      return false;
    }

    console.log('✅ Write permissions working');

    // Clean up
    if (insertData && insertData.length > 0) {
      await supabase
        .from('coupons')
        .delete()
        .eq('id', insertData[0].id);
      console.log('✅ Cleanup successful');
    }

    return true;

  } catch (error) {
    console.error('💥 Exception during permission test:', error);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting coupon creation tests...\n');

  const permissionsOk = await testDatabasePermissions();
  if (!permissionsOk) {
    console.log('\n❌ Database permissions test failed. Cannot proceed with coupon creation tests.');
    return;
  }

  console.log('\n' + '='.repeat(50));

  const creationOk = await testCouponCreation();

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results:');
  console.log(`Database Permissions: ${permissionsOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Coupon Creation: ${creationOk ? '✅ PASS' : '❌ FAIL'}`);

  if (permissionsOk && creationOk) {
    console.log('\n🎉 All tests passed! Coupon creation should work in the admin dashboard.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above for details.');
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log('\n✨ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  });
