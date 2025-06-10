// Script to test admin coupon creation workflow
// This simulates what happens when the admin dashboard creates a coupon
// Run with: node scripts/test-admin-coupon-creation.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client with anon key (like the frontend)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function simulateAdminCouponCreation() {
  console.log('🧪 Simulating admin coupon creation workflow...');
  
  try {
    // Simulate the form data from admin dashboard
    const newCoupon = {
      code: 'ADMINTEST30',
      type: 'percentage',
      amount: '30',
      validFrom: new Date().toISOString().split('T')[0],
      expiresAt: '',
      usageLimit: '50'
    };

    console.log('📝 Form data:', newCoupon);

    // Validate inputs (same as in admin dashboard)
    if (!newCoupon.code || !newCoupon.amount) {
      throw new Error('Please fill in all required fields');
    }

    const amount = parseFloat(newCoupon.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid discount amount');
    }

    if (newCoupon.type === 'percentage' && amount > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    console.log('✅ Form validation passed');

    // Check if coupon code already exists
    const { data: existingCoupon } = await supabase
      .from('coupons')
      .select('code')
      .eq('code', newCoupon.code.toUpperCase())
      .maybeSingle();

    if (existingCoupon) {
      console.log('⚠️  Coupon already exists, deleting for test...');
      await supabase
        .from('coupons')
        .delete()
        .eq('code', newCoupon.code.toUpperCase());
    }

    // Create coupon data (same as in admin dashboard)
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

    // Insert into database (same as in admin dashboard)
    const { data, error: dbError } = await supabase
      .from('coupons')
      .insert(couponData)
      .select();

    if (dbError) {
      console.error('❌ Database error creating coupon:', dbError);
      throw new Error(`Failed to create coupon: ${dbError.message}`);
    }

    if (data && data.length > 0) {
      console.log('✅ Coupon created successfully:', {
        id: data[0].id,
        code: data[0].code,
        type: data[0].type,
        amount: data[0].amount,
        usage_limit: data[0].usage_limit
      });

      // Test that the coupon can be fetched (like the admin dashboard does)
      console.log('\n🔍 Testing coupon retrieval...');
      
      const { data: fetchedCoupons, error: fetchError } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error fetching coupons:', fetchError);
      } else {
        console.log('✅ Coupons fetched successfully. Total count:', fetchedCoupons.length);
        
        const ourCoupon = fetchedCoupons.find(c => c.code === newCoupon.code.toUpperCase());
        if (ourCoupon) {
          console.log('✅ Our created coupon found in list:', {
            code: ourCoupon.code,
            type: ourCoupon.type,
            amount: ourCoupon.amount
          });
        } else {
          console.log('❌ Our created coupon not found in list');
        }
      }

      // Test coupon validation (like checkout would do)
      console.log('\n🧪 Testing coupon validation...');
      
      const { data: validationCoupon, error: validationError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', newCoupon.code.toUpperCase())
        .maybeSingle();

      if (validationError) {
        console.error('❌ Validation error:', validationError);
      } else if (validationCoupon) {
        console.log('✅ Coupon validation successful:', {
          code: validationCoupon.code,
          type: validationCoupon.type,
          amount: validationCoupon.amount,
          valid: true,
          message: `Promo code applied: ${validationCoupon.type === 'percentage' ? `${validationCoupon.amount}% off` : `$${validationCoupon.amount} off`}`
        });
      } else {
        console.log('❌ Coupon not found during validation');
      }

      // Clean up
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
      console.error('❌ No data returned from coupon creation');
      return false;
    }

  } catch (error) {
    console.error('💥 Exception during admin coupon creation test:', error);
    return false;
  }
}

async function runAdminTest() {
  console.log('🚀 Starting admin coupon creation test...\n');
  
  const success = await simulateAdminCouponCreation();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results:');
  console.log(`Admin Coupon Creation: ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (success) {
    console.log('\n🎉 Admin coupon creation workflow is working correctly!');
    console.log('💡 The admin dashboard should be able to create coupons successfully.');
    console.log('💡 If you\'re still having issues, check:');
    console.log('   - Browser console for JavaScript errors');
    console.log('   - Network tab for failed API requests');
    console.log('   - Admin authentication status');
  } else {
    console.log('\n⚠️  Admin coupon creation test failed. Check the errors above.');
  }
}

// Run the test
runAdminTest()
  .then(() => {
    console.log('\n✨ Admin test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Admin test script failed:', error);
    process.exit(1);
  });
