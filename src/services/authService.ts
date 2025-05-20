import { supabase, supabaseAdmin } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import { Provider } from '@supabase/supabase-js';

// Interface for user registration data
export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Interface for login data
export interface LoginData {
  email: string;
  password: string;
}

// Hash password using CryptoJS
const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

/**
 * Hybrid function to register a new user
 * Tries Supabase Auth first, then falls back to custom auth if that fails
 */
export const registerUser = async (userData: RegisterUserData): Promise<{ success: boolean; message: string; userId?: string; isSupabaseAuth?: boolean }> => {
  try {
    console.log('Starting hybrid user registration process');

    // First, try to register with Supabase Auth
    console.log('Attempting to register with Supabase Auth');

    try {
      // Check if user already exists in auth.users
      const { data: existsData, error: existsError } = await supabase
        .rpc('auth_user_exists', { user_email: userData.email });

      if (existsError) {
        console.error('Error checking if auth user exists:', existsError);
      } else if (existsData) {
        return { success: false, message: 'User with this email already exists' };
      }

      // Try to create user directly in auth.users using our custom function
      const { data: authUserId, error: createError } = await supabase
        .rpc('create_auth_user', {
          user_email: userData.email,
          user_password: userData.password,
          user_first_name: userData.firstName,
          user_last_name: userData.lastName
        });

      if (createError) {
        console.error('Error creating auth user with RPC:', createError);
        console.log('Trying standard Supabase Auth signup');

        // Fall back to standard Supabase Auth signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              first_name: userData.firstName,
              last_name: userData.lastName,
              full_name: `${userData.firstName} ${userData.lastName}`
            }
          }
        });

        // If successful, return success
        if (!authError && authData.user) {
          console.log('Supabase Auth registration successful:', authData.user);

          return {
            success: true,
            message: 'User registered successfully with Supabase Auth',
            userId: authData.user.id,
            isSupabaseAuth: true
          };
        }

        // If there's an error, log it and fall back to custom auth
        if (authError) {
          console.error('Supabase Auth registration failed:', authError);
          console.log('Falling back to custom auth registration');
        }
      } else {
        // User created successfully with our custom function
        console.log('Auth user created successfully with RPC:', authUserId);

        // Try to sign in with the new credentials to get a session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: userData.password
        });

        if (signInError) {
          console.error('Error signing in after registration:', signInError);
        } else {
          console.log('Signed in successfully after registration');
        }

        return {
          success: true,
          message: 'User registered successfully with Supabase Auth',
          userId: authUserId,
          isSupabaseAuth: true
        };
      }
    } catch (authError) {
      console.error('Exception during Supabase Auth registration:', authError);
      console.log('Falling back to custom auth registration');
    }

    // If Supabase Auth failed, use our custom registration process
    console.log('Starting custom user registration process');

    // Check if user already exists using the RPC function
    try {
      const { data: exists, error: checkError } = await supabase
        .rpc('user_exists', { user_email: userData.email });

      if (checkError) {
        console.error('Error checking for existing user with RPC:', checkError);
        throw checkError;
      }

      if (exists) {
        return { success: false, message: 'User with this email already exists' };
      }
    } catch (rpcError) {
      console.log('RPC check failed, falling back to direct query');

      // Fallback to direct query
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .limit(1);

      if (checkError) {
        console.error('Error checking for existing user:', checkError);
        return { success: false, message: 'Error checking for existing user' };
      }

      if (existingUsers && existingUsers.length > 0) {
        return { success: false, message: 'User with this email already exists' };
      }
    }

    // Generate a unique ID for the user
    const userId = uuidv4();

    // Hash the password
    const hashedPassword = hashPassword(userData.password);

    // Insert the user into the database using admin client if available
    // This bypasses RLS policies
    const client = supabaseAdmin || supabase;
    console.log('Using admin client for registration:', !!supabaseAdmin);

    const { data, error } = await client
      .from('users')
      .insert([
        {
          id: userId,
          email: userData.email,
          password_hash: hashedPassword,
          first_name: userData.firstName,
          last_name: userData.lastName,
          full_name: `${userData.firstName} ${userData.lastName}`,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error inserting user:', error);

      // If we get an RLS error, try using the RPC function as a fallback
      if (error.message.includes('violates row-level security policy')) {
        console.log('Attempting to register user via RPC function...');

        try {
          // Create a stored procedure in Supabase that can bypass RLS
          // For now, we'll just create a simpler user record
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('create_user', {
              user_id: userId,
              user_email: userData.email,
              user_password: hashedPassword,
              user_first_name: userData.firstName,
              user_last_name: userData.lastName,
              user_full_name: `${userData.firstName} ${userData.lastName}`
            });

          if (rpcError) {
            console.error('Error creating user via RPC:', rpcError);
            return { success: false, message: `Error creating user: ${rpcError.message}` };
          }

          console.log('User created successfully via RPC');
          return {
            success: true,
            message: 'User registered successfully with custom auth',
            userId: userId,
            isSupabaseAuth: false
          };
        } catch (rpcError: any) {
          console.error('Exception during RPC user creation:', rpcError);
          return { success: false, message: `Registration failed: ${rpcError.message}` };
        }
      }

      return { success: false, message: `Error creating user: ${error.message}` };
    }

    console.log('User registered successfully with custom auth:', data);
    return {
      success: true,
      message: 'User registered successfully with custom auth',
      userId: userId,
      isSupabaseAuth: false
    };
  } catch (error: any) {
    console.error('Exception during user registration:', error);
    return { success: false, message: `Registration failed: ${error.message}` };
  }
};

/**
 * Hybrid function to log in a user
 * Prioritizes custom auth, then falls back to Supabase Auth if that fails
 */
export const loginUser = async (loginData: LoginData, forceSupabaseAuth: boolean = false): Promise<{ success: boolean; message: string; user?: any; isSupabaseAuth?: boolean }> => {
  try {
    console.log('Starting hybrid login process');

    // Check if the user exists in auth.users first
    try {
      const { data: authUserExists, error: authUserError } = await supabase
        .rpc('auth_user_exists', { user_email: loginData.email });

      if (!authUserError && authUserExists) {
        console.log('User exists in auth.users, prioritizing Supabase Auth');
        forceSupabaseAuth = true;
      }
    } catch (error) {
      console.error('Error checking if user exists in auth.users:', error);
    }

    // If not forcing Supabase Auth, try custom auth first
    if (!forceSupabaseAuth) {
      // Try our custom login process first
      console.log('Starting custom login process');

      // Hash the password
      const hashedPassword = hashPassword(loginData.password);

      // Use the authenticate_user function to find the user
      let userData;
      try {
        console.log('Attempting to authenticate with custom auth:', loginData.email);
        console.log('Using hashed password:', hashedPassword.substring(0, 10) + '...');

        // Try using the admin client first if available
        const client = supabaseAdmin || supabase;
        console.log('Using admin client for authentication:', !!supabaseAdmin);

        // First, just check if the user exists by email
        const { data: userCheck, error: userCheckError } = await client
          .from('users')
          .select('id, email')
          .eq('email', loginData.email)
          .single();

        if (userCheckError) {
          console.error('Error checking if user exists:', userCheckError);
        } else {
          console.log('User exists check:', !!userCheck);
        }

        // Now try the RPC function
        const { data, error } = await client
          .rpc('authenticate_user', {
            user_email: loginData.email,
            user_password_hash: hashedPassword
          });

        if (error) {
          console.error('Error during login with RPC:', error);
          throw error;
        }

        console.log('RPC authenticate_user result:', { success: !!data, count: data?.length || 0 });

        if (!data || data.length === 0) {
          throw new Error('No user found');
        }

        userData = data[0];
      } catch (rpcError) {
        console.log('RPC failed, falling back to direct query:', rpcError);

        // Fallback to direct query if RPC fails
        console.log('Attempting direct query for user:', loginData.email);

        // Try using the admin client first if available
        const client = supabaseAdmin || supabase;
        console.log('Using admin client for direct query:', !!supabaseAdmin);

        const { data: directData, error: directError } = await client
          .from('users')
          .select('*')
          .eq('email', loginData.email)
          .eq('password_hash', hashedPassword)
          .single();

        console.log('Direct query result:', { success: !!directData, error: directError });

        if (directError || !directData) {
          console.error('Invalid email or password in direct query');
          throw new Error('Invalid email or password');
        }

        userData = directData;
      }

      if (!userData) {
        throw new Error('Invalid email or password');
      }

      console.log('User logged in successfully');

      // Store user session in localStorage
      const userObj = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        fullName: userData.full_name
      };
      localStorage.setItem('user', JSON.stringify(userObj));

      // Dispatch a custom event for login
      window.dispatchEvent(new CustomEvent('user-login', {
        detail: { userId: userData.id }
      }));

      return {
        success: true,
        message: 'Login successful with custom auth',
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          fullName: userData.full_name
        },
        isSupabaseAuth: false
      };
    }
    // Try Supabase Auth if we're forcing it or if custom auth wasn't attempted/failed
    if (forceSupabaseAuth === true) {
      console.log('Trying Supabase Auth');

      try {
        // Try to sign in with Supabase Auth
        console.log('Attempting to sign in with Supabase Auth:', loginData.email);
        console.log('Using URL:', import.meta.env.VITE_SUPABASE_URL);
        console.log('Using anon key (first 10 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 10) + '...');

        // First check if the user exists in auth.users
        const { data: userCheck, error: userCheckError } = await supabase
          .rpc('auth_user_exists', { user_email: loginData.email });

        if (userCheckError) {
          console.error('Error checking if auth user exists:', userCheckError);
        } else {
          console.log('Auth user exists check:', userCheck);
        }

        // Create a fresh client for this login attempt
        const freshClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        );

        // Now try to sign in with the fresh client
        console.log('Attempting sign in with fresh client');
        const { data: authData, error: authError } = await freshClient.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password
        });

        console.log('Supabase Auth sign in result:', {
          success: !authError,
          user: authData?.user ? 'exists' : 'none',
          error: authError ? authError.message : null,
          errorCode: authError ? authError.code : null
        });

        // If successful, return success
        if (!authError && authData.user) {
          console.log('Supabase Auth login successful:', authData.user);

          try {
            // Get user profile data
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            // Create user object with fallbacks for missing profile data
            const user = {
              id: authData.user.id,
              email: authData.user.email,
              firstName: profile?.first_name || authData.user.user_metadata?.first_name || '',
              lastName: profile?.last_name || authData.user.user_metadata?.last_name || '',
              fullName: profile?.full_name || authData.user.user_metadata?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
            };

            // Store user session in localStorage for compatibility with our custom auth
            localStorage.setItem('user', JSON.stringify(user));

            // Dispatch a custom event for login
            window.dispatchEvent(new CustomEvent('user-login', {
              detail: { userId: user.id }
            }));

            return {
              success: true,
              message: 'Login successful with Supabase Auth',
              user,
              isSupabaseAuth: true
            };
          } catch (profileError) {
            console.error('Error handling profile:', profileError);

            // Even if profile handling fails, still log the user in with basic info
            const user = {
              id: authData.user.id,
              email: authData.user.email,
              firstName: authData.user.user_metadata?.first_name || '',
              lastName: authData.user.user_metadata?.last_name || '',
              fullName: authData.user.user_metadata?.full_name || ''
            };

            localStorage.setItem('user', JSON.stringify(user));

            // Dispatch a custom event for login
            window.dispatchEvent(new CustomEvent('user-login', {
              detail: { userId: user.id }
            }));

            return {
              success: true,
              message: 'Login successful with basic user data',
              user,
              isSupabaseAuth: true
            };
          }
        }

        // If there's an error, log it
        if (authError) {
          console.error('Supabase Auth login failed:', authError);

          // Check if it's an invalid credentials error
          if (authError.message.includes('Invalid login credentials')) {
            // Try to check if the user exists but password is wrong
            try {
              const { data: userExists, error: checkError } = await supabase
                .rpc('auth_user_exists', { user_email: loginData.email });

              if (!checkError && userExists) {
                return {
                  success: false,
                  message: 'Incorrect password. The email exists but the password is wrong.'
                };
              }
            } catch (checkError) {
              console.error('Error checking if user exists:', checkError);
            }
          }

          return { success: false, message: `Login failed: ${authError.message}` };
        }
      } catch (authError: any) {
        console.error('Exception during Supabase Auth login:', authError);
        return { success: false, message: `Login failed: ${authError.message}` };
      }
    }

    // If we get here, both auth methods failed or weren't attempted
    return { success: false, message: 'Login failed. Please check your credentials and try again.' };
  } catch (error: any) {
    console.error('Exception during login process:', error);
    return { success: false, message: `Login failed: ${error.message}` };
  }
};

/**
 * Function to check if user is logged in
 */
export const isLoggedIn = (): boolean => {
  const user = localStorage.getItem('user');
  return !!user;
};

/**
 * Function to get current user
 */
export const getCurrentUser = (): any => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

/**
 * Function to initiate social authentication
 */
export const signInWithSocialProvider = async (
  provider: Provider,
  redirectTo?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`Initiating sign in with ${provider}`);

    // Store the redirect URL if provided
    if (redirectTo) {
      sessionStorage.setItem('redirectAfterAuth', redirectTo);
    }

    // Create a fresh client for this OAuth flow to avoid any session state issues
    const freshClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          debug: true
        }
      }
    );

    console.log('Created fresh client for OAuth flow');

    // Initiate OAuth flow
    const { data, error } = await freshClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/auth/callback',
        queryParams: {
          // Add access_type=offline to get a refresh token
          access_type: 'offline',
          // Add prompt=consent to always show the consent screen
          prompt: 'consent',
        },
        // Ensure we're getting all the scopes we need
        scopes: provider === 'google' ? 'email profile' : undefined
      }
    });

    if (error) {
      console.error(`${provider} auth error:`, error);
      return { success: false, message: error.message };
    }

    console.log(`${provider} auth initiated:`, data);
    return { success: true, message: 'Authentication initiated' };

  } catch (error: any) {
    console.error(`Exception during ${provider} auth:`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Function to log out user
 */
export const logoutUser = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Get user info before removing it
    const userInfo = localStorage.getItem('user');
    let userId = '';

    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        userId = parsedUser.id;
      } catch (e) {
        console.error('Error parsing user info during logout:', e);
      }
    }

    // Remove user from localStorage
    localStorage.removeItem('user');

    // We don't remove the user's cart from localStorage anymore
    // This way their cart items will be preserved when they log back in
    console.log(`Preserving cart items for user ${userId} for when they log back in`);

    // Trigger storage event to update auth context
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user',
      newValue: null
    }));

    // Also dispatch a custom event for direct listeners
    window.dispatchEvent(new CustomEvent('user-logout'));

    // Also try to sign out from Supabase Auth as a fallback
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out from Supabase Auth:', error);
      // Continue with logout even if Supabase signout fails
    }

    return { success: true, message: 'Logged out successfully' };
  } catch (error: any) {
    console.error('Error during logout:', error);
    return { success: false, message: `Logout failed: ${error.message}` };
  }
};
