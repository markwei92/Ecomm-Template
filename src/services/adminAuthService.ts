import { createClient } from '@supabase/supabase-js';

// Interface for user registration data
export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Create a fresh Supabase admin client
const createAdminClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Creating fresh Supabase admin client');
  console.log('URL:', supabaseUrl);
  console.log('Using service role key (first 10 chars):', supabaseServiceKey.substring(0, 10) + '...');
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
};

/**
 * Register a new user using the admin API
 * This bypasses the issues with the regular auth.signUp method
 */
export const registerUserWithAdmin = async (userData: RegisterUserData): Promise<{ 
  success: boolean; 
  message: string; 
  userId?: string;
}> => {
  try {
    console.log('Starting admin user registration process');
    
    // Create a fresh admin client
    const supabaseAdmin = createAdminClient();
    
    // Check if user already exists
    console.log('Checking if user already exists:', userData.email);
    const { data: existingUser, error: userError } = await supabaseAdmin
      .rpc('get_auth_user_details', { user_email: userData.email });
      
    if (userError) {
      console.error('Error checking if user exists:', userError);
      // Continue anyway, as the error might be because the user doesn't exist
    } else if (existingUser && existingUser.exists) {
      console.log('User already exists:', existingUser);
      return { 
        success: false, 
        message: 'A user with this email already exists. Please use a different email or try logging in.' 
      };
    }
    
    // Create the user with the admin API
    console.log('Creating user with admin API:', userData.email);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Automatically confirm the email
      user_metadata: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        full_name: `${userData.firstName} ${userData.lastName}`
      }
    });
    
    if (error) {
      console.error('Error creating user with admin API:', error);
      return { 
        success: false, 
        message: `Failed to create user: ${error.message}` 
      };
    }
    
    console.log('User created successfully with admin API:', data.user);
    
    return {
      success: true,
      message: 'User registered successfully',
      userId: data.user.id
    };
  } catch (error) {
    console.error('Exception during admin user registration:', error);
    return { 
      success: false, 
      message: `An unexpected error occurred: ${error.message}` 
    };
  }
};

/**
 * Sign in with email and password
 * This uses the same method as fixedAuthService.js but simplified
 */
export const signInWithEmail = async (email: string, password: string): Promise<{
  success: boolean;
  message: string;
  user?: any;
  session?: any;
}> => {
  try {
    console.log('Attempting to sign in with email:', email);
    
    // Create a fresh client for this login attempt
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Sign in failed:', error);
      
      // If it's a database error, try with admin client
      if (error.message === 'Database error querying schema') {
        console.log('Database error detected, trying with service role key...');
        
        // Create admin client
        const supabaseAdmin = createAdminClient();
        
        // Reset the password to ensure it's correct
        const { data: resetData, error: resetError } = await supabaseAdmin
          .rpc('admin_reset_password', { 
            user_email: email,
            new_password: password
          });
          
        if (resetError) {
          console.error('Error resetting password:', resetError);
          return { 
            success: false, 
            message: `Error resetting password: ${resetError.message}` 
          };
        }
        
        console.log('Password reset successful, trying to sign in again');
        
        // Try to sign in again
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          console.error('Sign in still failed after password reset:', signInError);
          return { 
            success: false, 
            message: `Login failed: ${signInError.message}` 
          };
        }
        
        console.log('Sign in successful after password reset!');
        
        // Store user in localStorage
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
          message: 'Login successful',
          user,
          session: signInData.session
        };
      }
      
      return { 
        success: false, 
        message: `Login failed: ${error.message}` 
      };
    }
    
    console.log('Sign in successful!');
    
    // Store user in localStorage
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
  } catch (error) {
    console.error('Exception during sign in:', error);
    return { 
      success: false, 
      message: `An unexpected error occurred: ${error.message}` 
    };
  }
};
