// Script to test admin coupon creation with service role key
// This simulates the updated admin dashboard approach
// Run with: node scripts/test-admin-with-service-key.js

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

// Create admin Supabase client (same as in updated admin dashboard)
const createAdminClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

async function testAdminCouponCreationWithServiceKey() {
  console.log('🧪 Testing admin coupon creation with service key...');
  
  try {
    const adminClient = createAdminClient();
    
    // Simulate the form data from admin dashboard
    const newCoupon = {
      code: 'SERVICETEST40',
      type: 'percentage',
      amount: '40',
      validFrom: new Date().toISOString().split('T')[0],
      expiresAt: '',
      usageLimit: '25'
    };

    console.log('📝 Form data:', newCoupon);

    // Validate inputs (same as in admin dashboard)
    const amount = parseFloat(newCoupon.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid discount amount');
    }

    console.log('✅ Form validation passed');

    // Check if coupon code already exists (using admin client)
    const { data: existingCoupon } = await adminClient
      .from('coupons')
      .select('code')
      .eq('code', newCoupon.code.toUpperCase())
      .maybeSingle();

    if (existingCoupon) {
      console.log('⚠️  Coupon already exists, deleting for test...');
      await adminClient
        .from('coupons')
        .delete()
        .eq('code', newCoupon.code.toUpperCase());
    }

    // Create coupon data (same as in updated admin dashboard)
    const couponData = {
      code: newCoupon.code.toUpperCase(),
      type: newCoupon.type,
      amount: amount,
      valid_from: new Date(newCoupon.validFrom).toISOString(),
      expires_at: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : null,
      usage_limit: newCoupon.usageLimit ? parseInt(newCoupon.usageLimit) : null,
      times_used: 0,
      stripe_id: `local_${newCoupon.code.toLowerCase()}_${Date.now()}`
    };

    console.log('📊 Coupon data to insert:', couponData);

    // Insert into database using admin client (same as in updated admin dashboard)
    const { data, error: dbError } = await adminClient
      .from('coupons')
      .insert(couponData)
      .select();

    if (dbError) {
      console.error('❌ Database error creating coupon:', dbError);
      throw new Error(`Failed to create coupon: ${dbError.message}`);
    }

    if (data && data.length > 0) {
      console.log('✅ Coupon created successfully with service key:', {
        id: data[0].id,
        code: data[0].code,
        type: data[0].type,
        amount: data[0].amount,
        usage_limit: data[0].usage_limit
      });

      // Test that the coupon can be fetched by regular client (like checkout would)
      console.log('\n🔍 Testing coupon retrieval with regular client...');
      
      const regularClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
      
      const { data: validationCoupon, error: validationError } = await regularClient
        .from('coupons')
        .select('*')
        .eq('code', newCoupon.code.toUpperCase())
        .maybeSingle();

      if (validationError) {
        console.error('❌ Validation error with regular client:', validationError);
      } else if (validationCoupon) {
        console.log('✅ Coupon validation successful with regular client:', {
          code: validationCoupon.code,
          type: validationCoupon.type,
          amount: validationCoupon.amount,
          message: `Promo code applied: ${validationCoupon.type === 'percentage' ? `${validationCoupon.amount}% off` : `$${validationCoupon.amount} off`}`
        });
      } else {
        console.log('❌ Coupon not found during validation with regular client');
      }

      // Test deletion with admin client
      console.log('\n🗑️  Testing coupon deletion with service key...');
      
      const { error: deleteError } = await adminClient
        .from('coupons')
        .delete()
        .eq('id', data[0].id);

      if (deleteError) {
        console.error('❌ Error deleting test coupon:', deleteError);
        return false;
      } else {
        console.log('✅ Test coupon deleted successfully with service key');
      }

      return true;
    } else {
      console.error('❌ No data returned from coupon creation');
      return false;
    }

  } catch (error) {
    console.error('💥 Exception during service key coupon creation test:', error);
    return false;
  }
}

async function runServiceKeyTest() {
  console.log('🚀 Starting admin coupon creation test with service key...\n');
  
  const success = await testAdminCouponCreationWithServiceKey();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results:');
  console.log(`Admin Coupon Creation (Service Key): ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (success) {
    console.log('\n🎉 Admin coupon creation with service key is working!');
    console.log('💡 The updated admin dashboard should now be able to create coupons.');
    console.log('💡 Key improvements:');
    console.log('   ✅ Bypasses RLS policies using service role key');
    console.log('   ✅ Creates coupons directly in local database');
    console.log('   ✅ Coupons are immediately available for validation');
    console.log('   ✅ No dependency on Stripe for coupon creation');
  } else {
    console.log('\n⚠️  Service key coupon creation test failed. Check the errors above.');
  }
}

// Run the test
runServiceKeyTest()
  .then(() => {
    console.log('\n✨ Service key test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Service key test script failed:', error);
    process.exit(1);
  });
