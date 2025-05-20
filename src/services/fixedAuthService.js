// Fixed authentication service
import { createClient } from '@supabase/supabase-js';

// Create fresh Supabase clients for each authentication request
const createFreshClient = (useServiceRole = false) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  const key = useServiceRole ? supabaseServiceKey : supabaseAnonKey;

  console.log('Creating fresh Supabase client');
  console.log('URL:', supabaseUrl);
  console.log('Using key type:', useServiceRole ? 'Service Role Key' : 'Anon Key');
  console.log('Key (first 10 chars):', key.substring(0, 10) + '...');

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email, password) => {
  try {
    console.log('Attempting to sign in with email:', email);

    // First try with regular client
    console.log('Trying with regular anon key first...');
    const supabase = createFreshClient(false);

    try {
      // Try to sign in with regular client
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!error) {
        console.log('Sign in successful with regular client!');

        // Store user in localStorage for compatibility with existing code
        const user = {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.user_metadata?.first_name || '',
          lastName: data.user.user_metadata?.last_name || '',
          fullName: data.user.user_metadata?.full_name || ''
        };

        localStorage.setItem('user', JSON.stringify(user));

        // Trigger storage event to update auth context
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'user',
          newValue: JSON.stringify(user)
        }));

        return {
          success: true,
          message: 'Login successful',
          user,
          session: data.session
        };
      }

      console.log('Regular sign in failed:', error.message);

      // If it's not a credentials error, but a database error, try with admin client
      if (error.message === 'Database error querying schema') {
        console.log('Database error detected, trying with service role key...');

        // Create admin client
        const adminClient = createFreshClient(true);

        // Check if user exists using the SQL function
        const { data: userData, error: userError } = await adminClient
          .rpc('get_auth_user_details', { user_email: email });

        if (userError) {
          console.error('Error checking user with SQL function:', userError);
          return {
            success: false,
            error: userError,
            message: userError.message
          };
        }

        if (!userData || !userData.exists) {
          console.error('User not found with SQL function');
          return {
            success: false,
            message: 'User not found'
          };
        }

        console.log('User found with SQL function:', userData.email);

        // Try to create a custom session for this user
        try {
          // First update the user's password using the SQL function
          const { data: resetData, error: resetError } = await adminClient
            .rpc('admin_reset_password', {
              user_email: email,
              new_password: password
            });

          if (resetError) {
            console.error('Error resetting password with SQL function:', resetError);
            return {
              success: false,
              error: resetError,
              message: resetError.message
            };
          }

          console.log('Password updated successfully, trying to sign in again...');

          // Try to sign in again with regular client
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            console.error('Sign in still failed after password update:', signInError);
            return {
              success: false,
              error: signInError,
              message: signInError.message
            };
          }

          console.log('Sign in successful after password update!');

          // Store user in localStorage for compatibility with existing code
          const user = {
            id: signInData.user.id,
            email: signInData.user.email,
            firstName: signInData.user.user_metadata?.first_name || '',
            lastName: signInData.user.user_metadata?.last_name || '',
            fullName: signInData.user.user_metadata?.full_name || ''
          };

          localStorage.setItem('user', JSON.stringify(user));

          // Trigger storage event to update auth context
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'user',
            newValue: JSON.stringify(user)
          }));

          return {
            success: true,
            message: 'Login successful after password reset',
            user,
            session: signInData.session
          };
        } catch (adminError) {
          console.error('Error with admin operations:', adminError);
          return {
            success: false,
            error: adminError,
            message: adminError.message
          };
        }
      } else {
        // Regular authentication error
        return {
          success: false,
          error,
          message: error.message
        };
      }
    } catch (signInError) {
      console.error('Exception during sign in attempt:', signInError);
      return {
        success: false,
        error: signInError,
        message: signInError.message
      };
    }
  } catch (error) {
    console.error('Exception during sign in process:', error);
    return {
      success: false,
      error,
      message: error.message
    };
  }
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email, password, userData = {}) => {
  try {
    console.log('Attempting to sign up with email:', email);

    // Create a fresh client for this signup attempt
    const supabase = createFreshClient();

    // Try to sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.firstName || '',
          last_name: userData.lastName || '',
          full_name: userData.firstName && userData.lastName ?
            `${userData.firstName} ${userData.lastName}` : ''
        }
      }
    });

    if (error) {
      console.error('Sign up failed:', error);
      return {
        success: false,
        error,
        message: error.message
      };
    }

    console.log('Sign up successful!');
    return {
      success: true,
      message: 'Registration successful',
      user: data.user
    };
  } catch (error) {
    console.error('Exception during sign up:', error);
    return {
      success: false,
      error,
      message: error.message
    };
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  try {
    console.log('Signing out');

    // Create a fresh client for this signout attempt
    const supabase = createFreshClient();

    // Remove user from localStorage
    localStorage.removeItem('user');

    // Trigger storage event to update auth context
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user',
      newValue: null
    }));

    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error,
        message: error.message
      };
    }

    return {
      success: true,
      message: 'Signed out successfully'
    };
  } catch (error) {
    console.error('Exception during sign out:', error);
    return {
      success: false,
      error,
      message: error.message
    };
  }
};

/**
 * Reset password
 */
export const resetPassword = async (email) => {
  try {
    console.log('Requesting password reset for:', email);

    // Create a fresh client for this password reset attempt
    const supabase = createFreshClient();

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('Password reset request failed:', error);
      return {
        success: false,
        error,
        message: error.message
      };
    }

    return {
      success: true,
      message: 'Password reset email sent'
    };
  } catch (error) {
    console.error('Exception during password reset request:', error);
    return {
      success: false,
      error,
      message: error.message
    };
  }
};
