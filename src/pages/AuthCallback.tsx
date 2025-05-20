import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth code from the URL
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const queryParams = new URLSearchParams(location.search);

        // Log the parameters for debugging
        console.log('Hash params:', Object.fromEntries(hashParams.entries()));
        console.log('Query params:', Object.fromEntries(queryParams.entries()));

        // Check if there's an error in the URL
        const errorParam = hashParams.get('error') || queryParams.get('error');
        if (errorParam) {
          const errorDescription = hashParams.get('error_description') ||
            queryParams.get('error_description') ||
            'Authentication failed';
          throw new Error(errorDescription);
        }

        // With detectSessionInUrl set to true, Supabase should automatically
        // process the URL and establish a session. We just need to verify it worked.
        console.log('Checking for established session...');

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw new Error(sessionError.message);
        }

        if (!session) {
          console.log('No session found, attempting to exchange auth tokens...');

          // Try to manually exchange the auth tokens
          // This is a fallback in case automatic detection didn't work
          try {
            // Get the access token and refresh token from the URL
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken) {
              console.log('Found access token in URL, setting session manually');

              // Set the session manually using the tokens
              const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });

              if (setSessionError) {
                console.error('Error setting session manually:', setSessionError);
                throw new Error(setSessionError.message);
              }

              if (!sessionData.session) {
                throw new Error('Failed to establish a session manually');
              }

              console.log('Session established manually:', !!sessionData.session);
            } else {
              // If no access token in URL, try refreshing the session one more time
              console.log('No tokens found in URL, trying one more session refresh');
              const { data: refreshData, error: refreshError } = await supabase.auth.getSession();

              if (refreshError) {
                console.error('Error refreshing session:', refreshError);
                throw new Error(refreshError.message);
              }

              if (!refreshData.session) {
                throw new Error('Failed to establish a session after multiple attempts');
              }

              console.log('Session established after refresh:', !!refreshData.session);
            }
          } catch (tokenError: any) {
            console.error('Error handling tokens:', tokenError);
            throw new Error(`Failed to establish session: ${tokenError.message}`);
          }
        } else {
          console.log('Session already exists');
        }

        // Get user data
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error('Error getting user:', userError);
          throw new Error(userError.message);
        }

        if (!user) {
          throw new Error('No user found after authentication');
        }

        console.log('User authenticated:', user);

        // Store user in localStorage for compatibility with our custom auth
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          email: user.email,
          firstName: user.user_metadata?.given_name || user.user_metadata?.first_name || '',
          lastName: user.user_metadata?.family_name || user.user_metadata?.last_name || '',
          fullName: user.user_metadata?.name || user.user_metadata?.full_name ||
            `${user.user_metadata?.given_name || user.user_metadata?.first_name || ''} ${user.user_metadata?.family_name || user.user_metadata?.last_name || ''}`.trim()
        }));

        // Manually trigger a storage event to update the auth context
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'user',
          newValue: localStorage.getItem('user')
        }));

        // Show success toast
        toast.success('Successfully signed in!');

        // Redirect to account page or the page they were trying to access
        const redirectTo = sessionStorage.getItem('redirectAfterAuth') || '/account';
        sessionStorage.removeItem('redirectAfterAuth');

        navigate(redirectTo, { replace: true });
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setError(error.message || 'Authentication failed');
        toast.error(`Authentication failed: ${error.message}`);

        // Redirect to login page after a delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {error ? (
          <>
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Authentication failed</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                    <p className="mt-2">Redirecting to login page...</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Completing authentication...
            </h2>
            <div className="mt-8 flex justify-center">
              <svg className="animate-spin h-10 w-10 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please wait while we complete your authentication...
            </p>
          </>
        )}
      </div>
    </div>
  );
};
