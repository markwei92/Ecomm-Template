// Script to check if test2@test2.com is properly set up as an admin
// Run with: node check-admin-status.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Error: Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase clients
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = 'test2@test2.com';

async function checkAdminStatus() {
  console.log('🔍 Checking admin status for:', testEmail);
  console.log('='.repeat(50));

  let userId = null;
  let rpcData = null;

  try {
    // Step 1: Check if user exists in auth.users
    console.log('1. Checking if user exists in auth.users...');
    const { data: authUsers, error: authError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, created_at, last_sign_in_at, email_confirmed_at')
      .eq('email', testEmail);

    if (authError) {
      console.log('   ❌ Error querying auth.users:', authError.message);

      // Try using RPC function as fallback
      console.log('   🔄 Trying RPC function fallback...');
      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc('get_auth_user_details', { user_email: testEmail });

      if (rpcError) {
        console.log('   ❌ RPC function also failed:', rpcError.message);
        return;
      }

      rpcData = rpcResult;
      if (rpcData && rpcData.exists) {
        console.log('   ✅ User found via RPC function');
        console.log('   📧 Email:', rpcData.email);
        console.log('   🆔 ID:', rpcData.id);
        console.log('   📅 Created:', rpcData.created_at);
        console.log('   🔐 Email confirmed:', rpcData.confirmed_at ? 'Yes' : 'No');
        userId = rpcData.id;
      } else {
        console.log('   ❌ User not found in auth.users');
        return;
      }
    } else if (authUsers && authUsers.length > 0) {
      const user = authUsers[0];
      console.log('   ✅ User found in auth.users');
      console.log('   📧 Email:', user.email);
      console.log('   🆔 ID:', user.id);
      console.log('   📅 Created:', user.created_at);
      console.log('   🔐 Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
      console.log('   🕐 Last sign in:', user.last_sign_in_at || 'Never');
      userId = user.id;
    } else {
      console.log('   ❌ User not found in auth.users');
      return;
    }

    // Step 2: Check if user exists in admin_users table
    console.log('\n2. Checking if user is in admin_users table...');
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, user_id, created_at, role')
      .eq('user_id', userId);

    if (adminError) {
      console.log('   ❌ Error querying admin_users:', adminError.message);
    } else if (adminUsers && adminUsers.length > 0) {
      const adminUser = adminUsers[0];
      console.log('   ✅ User found in admin_users table');
      console.log('   🆔 Admin ID:', adminUser.id);
      console.log('   👤 User ID:', adminUser.user_id);
      console.log('   📅 Admin since:', adminUser.created_at);
      console.log('   🎭 Role:', adminUser.role || 'admin');
    } else {
      console.log('   ❌ User NOT found in admin_users table');
      console.log('   ⚠️  This user is NOT an admin!');

      // Offer to add them as admin
      console.log('\n🔧 Would you like to add this user as an admin?');
      console.log('   Run: node add-admin-user.js to add them');
      return;
    }

    // Step 3: Test the is_admin function
    console.log('\n3. Testing is_admin() function...');
    const { data: isAdminResult, error: isAdminError } = await supabaseAdmin
      .rpc('is_admin', { check_user_id: userId });

    if (isAdminError) {
      console.log('   ❌ Error calling is_admin function:', isAdminError.message);
    } else {
      console.log('   ✅ is_admin() function result:', isAdminResult ? 'TRUE' : 'FALSE');
    }

    // Step 4: Test admin login flow
    console.log('\n4. Testing admin login flow...');
    try {
      // This simulates what happens in AdminLogin.tsx
      const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
        email: testEmail,
        password: 'test' // You'll need to provide the correct password
      });

      if (loginError) {
        console.log('   ⚠️  Cannot test login without correct password');
        console.log('   💡 Try logging in manually at /admin/login to test');
      } else {
        console.log('   ✅ Login successful');

        // Check admin status after login
        const { data: adminCheck, error: adminCheckError } = await supabaseAnon
          .from('admin_users')
          .select('*')
          .eq('user_id', loginData.user.id)
          .single();

        if (adminCheckError) {
          console.log('   ❌ Admin check failed after login:', adminCheckError.message);
        } else if (adminCheck) {
          console.log('   ✅ Admin check passed after login');
        } else {
          console.log('   ❌ Admin check failed - user not in admin_users');
        }

        // Sign out
        await supabaseAnon.auth.signOut();
      }
    } catch (error) {
      console.log('   ⚠️  Login test skipped:', error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY');
    console.log('='.repeat(50));

    const userExists = (authUsers && authUsers.length > 0) || (rpcData && rpcData.exists);
    const isAdmin = adminUsers && adminUsers.length > 0;

    if (userExists && isAdmin) {
      console.log('✅ RESULT: test2@test2.com is properly set up as an admin');
      console.log('🎉 You can proceed with removing the temporary admin bypass');
    } else if (userExists && !isAdmin) {
      console.log('⚠️  RESULT: test2@test2.com exists but is NOT an admin');
      console.log('🔧 ACTION NEEDED: Add this user to admin_users table');
    } else {
      console.log('❌ RESULT: test2@test2.com does not exist');
      console.log('🔧 ACTION NEEDED: Create this user first');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the check
checkAdminStatus().then(() => {
  console.log('\n🏁 Admin status check completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
