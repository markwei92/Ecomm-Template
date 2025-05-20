import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with admin privileges
 * This is used for operations that require bypassing RLS policies
 */
export const createAdminClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables for admin client');
    throw new Error('Supabase admin connection not configured');
  }
  
  console.log('Creating Supabase admin client');
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * Reset a user's password using the SQL function
 * This bypasses the email delivery system
 */
export const resetPasswordWithSQL = async (email: string, newPassword: string): Promise<{
  success: boolean;
  message: string;
  error?: any;
}> => {
  try {
    console.log(`Attempting to reset password for: ${email}`);
    
    // Create admin client
    const supabaseAdmin = createAdminClient();
    
    // Call the SQL function
    const { data, error } = await supabaseAdmin
      .rpc('admin_reset_password', {
        user_email: email,
        new_password: newPassword
      });
    
    if (error) {
      console.error('Error resetting password with SQL function:', error);
      return {
        success: false,
        message: `Failed to reset password: ${error.message}`,
        error
      };
    }
    
    // Check the result
    if (data && data.success === false) {
      console.error('Password reset failed:', data.error || 'Unknown error');
      return {
        success: false,
        message: data.error || 'User not found or password reset failed',
        error: data
      };
    }
    
    console.log('Password reset successful with SQL function');
    return {
      success: true,
      message: 'Password reset successful'
    };
  } catch (error: any) {
    console.error('Exception during password reset:', error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error.message}`,
      error
    };
  }
};

/**
 * Check if a user exists in auth.users
 */
export const checkUserExists = async (email: string): Promise<{
  success: boolean;
  exists: boolean;
  message: string;
  error?: any;
}> => {
  try {
    console.log(`Checking if user exists: ${email}`);
    
    // Create admin client
    const supabaseAdmin = createAdminClient();
    
    // Check if user exists in auth.users
    const { data, error } = await supabaseAdmin
      .rpc('auth_user_exists', { user_email: email });
    
    if (error) {
      console.error('Error checking if user exists:', error);
      return {
        success: false,
        exists: false,
        message: `Error checking if user exists: ${error.message}`,
        error
      };
    }
    
    return {
      success: true,
      exists: !!data,
      message: data ? 'User exists' : 'User does not exist'
    };
  } catch (error: any) {
    console.error('Exception during user check:', error);
    return {
      success: false,
      exists: false,
      message: `An unexpected error occurred: ${error.message}`,
      error
    };
  }
};
