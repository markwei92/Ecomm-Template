import { supabase, supabaseAdmin } from '../lib/supabase';
import CryptoJS from 'crypto-js';

// Hash password using CryptoJS
const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

// Test function to check if we can log in with test3@test3.com
export const testLogin = async (email: string, password: string): Promise<any> => {
  try {
    console.log('Testing login for:', email);

    // Hash the password
    const hashedPassword = hashPassword(password);
    console.log('Hashed password:', hashedPassword);

    // Check if the user exists in public.users
    const { data: userExists, error: userExistsError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    console.log('User exists check:', { exists: !!userExists, error: userExistsError });

    // Try direct query with the hashed password
    const { data: directData, error: directError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', hashedPassword)
      .single();

    console.log('Direct query result:', {
      success: !!directData,
      error: directError,
      user: directData
    });

    // Try the RPC function
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('authenticate_user', {
        user_email: email,
        user_password_hash: hashedPassword
      });

    console.log('RPC authenticate_user result:', {
      success: !!rpcData && rpcData.length > 0,
      error: rpcError,
      count: rpcData?.length || 0
    });

    // Try with admin client
    if (supabaseAdmin) {
      console.log('Trying with admin client');

      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password_hash', hashedPassword)
        .single();

      console.log('Admin client result:', {
        success: !!adminData,
        error: adminError,
        user: adminData
      });
    }

    // Try Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    console.log('Supabase Auth result:', {
      success: !authError && !!authData.user,
      error: authError,
      user: authData.user ? 'exists' : 'none'
    });

    return {
      userExists: !!userExists,
      directQuerySuccess: !!directData,
      rpcSuccess: !!rpcData && rpcData.length > 0,
      supabaseAuthSuccess: !authError && !!authData.user
    };
  } catch (error) {
    console.error('Error in test login:', error);
    return { error: error.message };
  }
};

// Test function to check what password hash is generated for a given password
export const testPasswordHash = (password: string): string => {
  const hash = hashPassword(password);
  console.log(`Password: "${password}" => Hash: "${hash}"`);

  // Check if it matches the known working hash
  const knownHash = '43b6630ee3a5548610a88be60fcc11c30d15bd0462a48cf3914d16a65b54cf7a';
  console.log(`Matches known hash: ${hash === knownHash}`);

  return hash;
};

// Test function to check if a user exists with a specific password hash
export const testUserWithHash = async (email: string, hash: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', hash)
      .single();

    return { success: !!data, error, user: data };
  } catch (error) {
    return { error: error.message };
  }
};

// Function to update a user's password hash
export const updateUserPasswordHash = async (email: string, newHash: string): Promise<any> => {
  try {
    // First check if the user exists in public.users
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) {
      console.log('User not found in public.users, checking auth.users');

      // Check if user exists in auth.users
      const { data: authUserExists, error: authUserError } = await supabase
        .rpc('auth_user_exists', { user_email: email });

      if (authUserError) {
        return { success: false, error: authUserError, message: 'Error checking auth.users' };
      }

      if (!authUserExists) {
        return { success: false, message: 'User not found in either public.users or auth.users' };
      }

      // User exists in auth.users, update password using admin functions
      if (supabaseAdmin) {
        try {
          // For Supabase Auth users, we need to use the admin API to update the password
          const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            'unknown', // We don't know the ID yet
            { password: '123456' } // Set to the known working password
          );

          return {
            success: false,
            message: 'Cannot update Supabase Auth users directly. Please use the Supabase dashboard to reset the password.',
            note: 'For Supabase Auth users, you need to reset the password through the Supabase dashboard or use the admin API with the user ID.'
          };
        } catch (adminError) {
          return {
            success: false,
            error: adminError,
            message: 'Cannot update Supabase Auth users directly. Please use the Supabase dashboard to reset the password.'
          };
        }
      } else {
        return {
          success: false,
          message: 'Cannot update Supabase Auth users without admin client. Please use the Supabase dashboard to reset the password.'
        };
      }
    }

    // User exists in public.users, update the password hash
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('users')
      .update({ password_hash: newHash })
      .eq('email', email)
      .select();

    if (error) {
      return { success: false, error, message: 'Error updating password hash' };
    }

    return {
      success: true,
      message: 'Password hash updated successfully for custom auth user',
      user: data
    };
  } catch (error) {
    return { error: error.message };
  }
};

// Function to check if a user exists in auth.users
export const checkAuthUser = async (email: string): Promise<any> => {
  try {
    console.log('Checking if user exists in auth.users:', email);

    // Use the new get_auth_user_details function
    const { data: userDetails, error: detailsError } = await supabase
      .rpc('get_auth_user_details', { user_email: email });

    if (detailsError) {
      console.error('Error checking user details with RPC:', detailsError);

      // Fall back to the original auth_user_exists function
      try {
        const { data: authUserExists, error: authUserError } = await supabase
          .rpc('auth_user_exists', { user_email: email });

        if (authUserError) {
          console.error('Error checking if auth user exists with RPC:', authUserError);
          return {
            success: false,
            exists: false,
            error: authUserError,
            message: 'Error checking if user exists'
          };
        }

        console.log('RPC auth_user_exists result:', authUserExists);

        return {
          success: true,
          exists: !!authUserExists,
          message: authUserExists ? 'User exists in auth.users' : 'User does not exist in auth.users',
          resetPasswordLink: authUserExists ?
            `https://rtwbnoblnlbnxdnuacak.supabase.co/auth/v1/verify?type=recovery&redirect_to=http://localhost:5173/` :
            null
        };
      } catch (rpcError) {
        console.error('Exception during RPC auth_user_exists:', rpcError);
      }

      // Fall back to direct query if both RPCs fail
      console.log('Falling back to direct query for auth user');

      // Use admin client if available for better permissions
      const client = supabaseAdmin || supabase;

      try {
        // Try direct SQL query
        const { data: sqlResult, error: sqlError } = await client
          .rpc('execute_sql', {
            sql_query: `SELECT id, email FROM auth.users WHERE email = '${email}' LIMIT 1`
          });

        if (sqlError) {
          console.error('Error with SQL query to auth.users:', sqlError);
          return {
            success: false,
            error: sqlError,
            message: 'Could not check if user exists in auth.users'
          };
        }

        const userExists = sqlResult && sqlResult.length > 0;
        return {
          success: true,
          exists: userExists,
          user: userExists ? sqlResult[0] : null,
          message: userExists ? 'User exists in auth.users (SQL query)' : 'User does not exist in auth.users (SQL query)'
        };
      } catch (sqlError) {
        console.error('Exception during SQL query:', sqlError);
        return {
          success: false,
          error: sqlError,
          message: 'Exception during user check'
        };
      }
    }

    // If we got here, the get_auth_user_details function worked
    console.log('User details from RPC:', userDetails);

    return {
      success: true,
      exists: userDetails.exists,
      user: userDetails.exists ? {
        id: userDetails.id,
        email: userDetails.email,
        created_at: userDetails.created_at,
        last_sign_in_at: userDetails.last_sign_in_at,
        confirmed_at: userDetails.confirmed_at
      } : null,
      message: userDetails.message,
      resetPasswordLink: userDetails.exists ?
        `https://rtwbnoblnlbnxdnuacak.supabase.co/auth/v1/verify?type=recovery&redirect_to=http://localhost:5173/` :
        null
    };
  } catch (error) {
    console.error('Exception during checkAuthUser:', error);
    return {
      success: false,
      exists: false,
      error: error.message,
      message: 'Exception during user check'
    };
  }
};

// Function to send a password reset email
export const sendPasswordResetEmail = async (email: string): Promise<any> => {
  try {
    console.log('Attempting to send password reset email to:', email);

    // First check if the user exists
    const { data: authUserExists, error: authUserError } = await supabase
      .rpc('auth_user_exists', { user_email: email });

    if (authUserError) {
      console.error('Error checking if auth user exists:', authUserError);
      return { success: false, error: authUserError };
    }

    if (!authUserExists) {
      return {
        success: false,
        error: { message: 'User does not exist in auth.users' },
        suggestion: 'This user might be a custom auth user. Try updating the password hash instead.'
      };
    }

    // Try to get the site URL from Supabase settings
    const siteUrl = 'http://localhost:5173';

    // Try the password reset
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      console.error('Error sending password reset email:', error);

      // If there's an error, provide alternative instructions
      return {
        success: false,
        error,
        alternativeMethod: true,
        message: 'There was an error sending the password reset email. This is likely because SMTP is not configured in your Supabase project.',
        instructions: [
          '1. Use the "Direct Password Update" function below instead',
          '2. Or go to the Supabase dashboard',
          '3. Navigate to Authentication > Users',
          '4. Find the user with this email',
          '5. Click on the three dots and select "Reset Password"'
        ]
      };
    }

    return {
      success: true,
      message: 'Password reset email sent successfully. Check your email for the reset link.',
      data
    };
  } catch (error) {
    console.error('Exception during password reset:', error);
    return { error: error.message };
  }
};

// Function to directly update a Supabase Auth user's password
export const directPasswordUpdate = async (email: string, newPassword: string): Promise<any> => {
  try {
    console.log('Attempting to directly update password for:', email);

    // First check if the user exists using our enhanced function
    const authUserCheck = await checkAuthUser(email);

    if (!authUserCheck.success || !authUserCheck.exists) {
      console.error('User does not exist in auth.users:', authUserCheck);
      return {
        success: false,
        error: { message: 'User does not exist in auth.users' },
        suggestion: 'This user might be a custom auth user. Try updating the password hash instead.',
        checkResult: authUserCheck
      };
    }

    // Try using the SQL function first (most reliable method)
    try {
      console.log('Attempting to reset password with SQL function');
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('admin_reset_password', {
          user_email: email,
          new_password: newPassword
        });

      if (!sqlError && sqlResult && sqlResult.success) {
        console.log('Password reset successful with SQL function');
        return {
          success: true,
          message: `Password for ${email} has been updated to "${newPassword}" using SQL function`,
          data: sqlResult
        };
      } else {
        console.error('Error resetting password with SQL function:', sqlError || sqlResult);
        // Fall back to other methods
      }
    } catch (sqlError) {
      console.error('Exception during SQL password reset:', sqlError);
      // Fall back to other methods
    }

    // Get the user ID - try different methods
    let userId = null;

    // Method 1: From the check result
    if (authUserCheck.userId) {
      userId = authUserCheck.userId;
      console.log('Got user ID from checkAuthUser result:', userId);
    }
    // Method 2: From the user object
    else if (authUserCheck.user && authUserCheck.user.id) {
      userId = authUserCheck.user.id;
      console.log('Got user ID from user object:', userId);
    }
    // Method 3: Try the RPC function
    else {
      try {
        const { data: rpcUserId, error: userIdError } = await supabase
          .rpc('get_auth_user_id', { user_email: email });

        if (!userIdError && rpcUserId) {
          userId = rpcUserId;
          console.log('Got user ID from RPC function:', userId);
        } else {
          console.error('Error getting user ID from RPC:', userIdError);
        }
      } catch (rpcError) {
        console.error('Exception getting user ID from RPC:', rpcError);
      }
    }

    // Method 4: Direct SQL query
    if (!userId) {
      try {
        const client = supabaseAdmin || supabase;
        const { data: sqlResult, error: sqlError } = await client
          .rpc('execute_sql', {
            sql_query: `SELECT id FROM auth.users WHERE email = '${email}' LIMIT 1`
          });

        if (!sqlError && sqlResult && sqlResult.length > 0) {
          userId = sqlResult[0].id;
          console.log('Got user ID from SQL query:', userId);
        } else {
          console.error('Error getting user ID from SQL:', sqlError);
        }
      } catch (sqlError) {
        console.error('Exception getting user ID from SQL:', sqlError);
      }
    }

    if (!userId) {
      return {
        success: false,
        error: { message: 'Could not get user ID' },
        suggestion: 'Try using the Supabase dashboard to reset the password'
      };
    }

    // Check if we have admin access
    if (!supabaseAdmin) {
      return {
        success: false,
        message: 'Cannot update password without admin access',
        suggestion: 'Make sure the service role key is properly configured'
      };
    }

    console.log('Updating password for user ID:', userId);

    // Update the password using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('Error updating password:', error);
      return { success: false, error };
    }

    return {
      success: true,
      message: `Password for ${email} has been updated to "${newPassword}"`,
      data
    };
  } catch (error) {
    console.error('Exception during direct password update:', error);
    return { error: error.message };
  }
};

// Function to reset password using SQL function directly
export const resetPasswordWithSQL = async (email: string, newPassword: string): Promise<any> => {
  try {
    console.log('Attempting to reset password with SQL function for:', email);

    // Call the SQL function
    const { data, error } = await supabase
      .rpc('admin_reset_password', {
        user_email: email,
        new_password: newPassword
      });

    if (error) {
      console.error('Error resetting password with SQL function:', error);
      return { success: false, error };
    }

    return {
      success: true,
      message: `Password for ${email} has been reset to "${newPassword}"`,
      data
    };
  } catch (error) {
    console.error('Exception during SQL password reset:', error);
    return { error: error.message };
  }
};

// Function to test direct Supabase Auth login
export const testSupabaseLogin = async (email: string, password: string): Promise<any> => {
  try {
    console.log('Testing direct Supabase Auth login with:', { email });

    // Import createClient
    const { createClient } = await import('@supabase/supabase-js');

    // Get environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log('Using URL:', supabaseUrl);
    console.log('Using anon key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');

    // Create a fresh client for this login attempt
    const freshClient = createClient(supabaseUrl, supabaseAnonKey);

    // Try to sign in with Supabase Auth directly
    console.log('Attempting sign in with fresh client');
    const { data, error } = await freshClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Supabase Auth login failed:', error);
      return {
        success: false,
        error,
        message: `Login failed: ${error.message}`
      };
    }

    console.log('Supabase Auth login successful:', data);

    return {
      success: true,
      message: 'Login successful with Supabase Auth',
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error('Exception during Supabase Auth login test:', error);
    return { error: error.message };
  }
};
