// Script to migrate legacy hardcoded coupons to the database
// Run with: node scripts/migrate-legacy-coupons.js

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

const legacyCoupons = [
  {
    code: 'TEST10',
    type: 'percentage',
    amount: 10,
    valid_from: new Date().toISOString(),
    expires_at: null,
    usage_limit: null,
    stripe_id: 'legacy_test10',
    times_used: 0
  },
  {
    code: 'TEST20',
    type: 'percentage',
    amount: 20,
    valid_from: new Date().toISOString(),
    expires_at: null,
    usage_limit: null,
    stripe_id: 'legacy_test20',
    times_used: 0
  },
  {
    code: 'FLAT5',
    type: 'fixed_amount',
    amount: 5,
    valid_from: new Date().toISOString(),
    expires_at: null,
    usage_limit: null,
    stripe_id: 'legacy_flat5',
    times_used: 0
  }
];

async function migrateLegacyCoupons() {
  console.log('🚀 Starting legacy coupon migration...');

  try {
    // Check if coupons table exists and is accessible
    console.log('📋 Checking coupons table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('coupons')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ Error accessing coupons table:', tableError);
      console.log('💡 Make sure the coupons table exists and RLS policies allow access');
      return;
    }

    console.log('✅ Coupons table is accessible');

    // Migrate each legacy coupon
    for (const coupon of legacyCoupons) {
      console.log(`\n🔍 Processing coupon: ${coupon.code}`);

      // Check if coupon already exists
      const { data: existing, error: checkError } = await supabase
        .from('coupons')
        .select('id, code, type, amount')
        .eq('code', coupon.code)
        .maybeSingle();

      if (checkError) {
        console.error(`❌ Error checking existing coupon ${coupon.code}:`, checkError);
        continue;
      }

      if (existing) {
        console.log(`⚠️  Coupon ${coupon.code} already exists:`, {
          id: existing.id,
          type: existing.type,
          amount: existing.amount
        });
        console.log(`✅ Skipping ${coupon.code} - already migrated`);
        continue;
      }

      // Insert the new coupon
      console.log(`📝 Creating coupon ${coupon.code}...`);
      const { data: inserted, error: insertError } = await supabase
        .from('coupons')
        .insert(coupon)
        .select();

      if (insertError) {
        console.error(`❌ Error creating coupon ${coupon.code}:`, insertError);
        continue;
      }

      if (inserted && inserted.length > 0) {
        console.log(`✅ Successfully created coupon ${coupon.code}:`, {
          id: inserted[0].id,
          type: inserted[0].type,
          amount: inserted[0].amount,
          stripe_id: inserted[0].stripe_id
        });
      } else {
        console.log(`⚠️  Coupon ${coupon.code} creation returned unexpected result`);
      }
    }

    // Display final summary
    console.log('\n📊 Migration Summary:');
    const { data: allCoupons, error: summaryError } = await supabase
      .from('coupons')
      .select('code, type, amount, times_used, created_at')
      .order('created_at', { ascending: true });

    if (summaryError) {
      console.error('❌ Error fetching summary:', summaryError);
    } else {
      console.log(`✅ Total coupons in database: ${allCoupons?.length || 0}`);
      if (allCoupons && allCoupons.length > 0) {
        console.log('\n📋 All coupons:');
        allCoupons.forEach(coupon => {
          console.log(`  - ${coupon.code}: ${coupon.type === 'percentage' ? `${coupon.amount}%` : `$${coupon.amount}`} off (used ${coupon.times_used} times)`);
        });
      }
    }

    console.log('\n🎉 Legacy coupon migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('1. Test the coupons in your application');
    console.log('2. Verify they work in both development and production');
    console.log('3. Create new coupons through the admin dashboard');

  } catch (error) {
    console.error('💥 Unexpected error during migration:', error);
  }
}

// Run the migration
migrateLegacyCoupons()
  .then(() => {
    console.log('\n✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
