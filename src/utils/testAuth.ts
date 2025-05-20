import { supabase } from '../lib/supabase';

/**
 * Test function to verify authentication is working
 * This can be used to debug authentication issues
 */
export const testAuth = async (email: string, password: string) => {
  console.log('=== TESTING AUTHENTICATION ===');
  console.log('Testing login with:', { email });

  try {
    // Step 1: Try custom authentication first
    console.log('Step 1: Trying custom authentication');

    // Import the loginUser function
    const { loginUser } = await import('../services/authService');

    // Try to login with custom auth first
    const customResult = await loginUser({ email, password }, false);

    if (customResult.success) {
      console.log('Authentication successful:', customResult.user,
        customResult.isSupabaseAuth ? 'using Supabase Auth' : 'using custom auth');
      return {
        success: true,
        user: customResult.user,
        isCustomAuth: !customResult.isSupabaseAuth
      };
    }

    console.log('Authentication failed with loginUser function, trying direct Supabase Auth');

    // Step 2: Sign out to clear any existing sessions
    console.log('Step 2: Signing out to clear existing sessions');
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error('Error signing out:', signOutError);
    } else {
      console.log('Successfully signed out');
    }

    // Step 3: Check if we're signed out
    console.log('Step 3: Verifying signed out state');
    const { data: sessionData1 } = await supabase.auth.getSession();
    console.log('Session after sign out:', sessionData1.session ? 'Still active (problem)' : 'None (good)');

    // Step 4: Attempt to sign in with Supabase Auth
    console.log('Step 4: Attempting to sign in with Supabase Auth');
    let signInData;
    let signInError;

    try {
      const result = await supabase.auth.signInWithPassword({
        email,
        password
      });

      signInData = result.data;
      signInError = result.error;

      if (signInError) {
        console.error('Sign in error:', signInError);

        // Special handling for database schema errors
        if (signInError.message && signInError.message.includes('Database error querying schema')) {
          console.error('Database schema error detected, attempting recovery...');

          // Try to get the user session directly
          const { data: sessionData } = await supabase.auth.getSession();

          if (sessionData.session && sessionData.session.user) {
            console.log('Successfully retrieved session despite schema error');

            // Override the sign in data with the session data
            signInData = {
              user: sessionData.session.user,
              session: sessionData.session
            };
            signInError = null;

            console.log('Recovery successful, proceeding with session');
          } else {
            console.error('Recovery failed, no session found');
            return { success: false, error: { message: 'Database schema error and recovery failed' } };
          }
        } else {
          return { success: false, error: signInError };
        }
      }
    } catch (error) {
      console.error('Exception during sign in:', error);
      return { success: false, error };
    }

    console.log('Sign in response:', {
      user: signInData.user ? 'User exists' : 'No user',
      session: signInData.session ? 'Session exists' : 'No session'
    });

    // Step 4: Verify session was created
    console.log('Step 4: Verifying session was created');
    const { data: sessionData2 } = await supabase.auth.getSession();
    console.log('Session after sign in:', sessionData2.session ? 'Active (good)' : 'None (problem)');

    if (!sessionData2.session) {
      return {
        success: false,
        error: { message: 'Failed to create session after successful login' }
      };
    }

    // Step 5: Get user data
    console.log('Step 5: Getting user data');
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error getting user data:', userError);
      return { success: false, error: userError };
    }

    console.log('User data:', userData.user ? 'User exists' : 'No user');

    return {
      success: true,
      user: userData.user,
      session: sessionData2.session
    };
  } catch (error) {
    console.error('Unexpected error during authentication test:', error);
    return { success: false, error };
  } finally {
    console.log('=== AUTHENTICATION TEST COMPLETE ===');
  }
};
