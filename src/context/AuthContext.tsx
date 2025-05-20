import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getCurrentUser, isLoggedIn } from '../services/authService';

// Define a custom user type that works with both Supabase Auth and our custom auth
interface CustomUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

interface AuthContextType {
  user: User | CustomUser | null;
  session: Session | null;
  isLoading: boolean;
  isCustomAuth: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isCustomAuth: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | CustomUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomAuth, setIsCustomAuth] = useState(false);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        console.log('Initializing auth context...');

        // Prioritize custom authentication
        if (isLoggedIn()) {
          console.log('Custom authentication detected');
          const customUser = getCurrentUser();
          if (customUser) {
            console.log('Custom user found:', customUser);
            setUser(customUser);
            setIsCustomAuth(true);
            setSession(null); // No Supabase session for custom auth
            setIsLoading(false);
            return;
          }
        }

        // Only if no custom auth is found, try Supabase auth as fallback
        console.log('No custom auth found, checking Supabase authentication as fallback');
        try {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Error getting session:', error);

            // If it's a schema error, we might still have a valid session
            if (error.message && error.message.includes('Database error querying schema')) {
              console.warn('Database schema error detected, but session might still be valid');

              // Try to get user info directly
              try {
                const { data: userData } = await supabase.auth.getUser();
                if (userData && userData.user) {
                  console.log('Successfully retrieved user despite schema error');
                  setSession(data.session); // Might be null but that's okay
                  setUser(userData.user);
                  setIsCustomAuth(false);
                  return;
                }
              } catch (userError) {
                console.error('Failed to get user after schema error:', userError);
              }
            }

            setSession(null);
            setUser(null);
            return;
          }

          console.log('Initial session:', data.session ? 'Found' : 'Not found');
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setIsCustomAuth(false);
        } catch (sessionError) {
          console.error('Exception getting session:', sessionError);

          // Try to recover by getting user directly
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData && userData.user) {
              console.log('Successfully retrieved user despite session error');
              setSession(null);
              setUser(userData.user);
              setIsCustomAuth(false);
              return;
            }
          } catch (userError) {
            console.error('Failed to get user after session error:', userError);
          }

          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth initialization:', error);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');

      // If we're using custom auth, don't update state based on Supabase auth changes
      if (isCustomAuth) {
        console.log('Ignoring Supabase auth change because custom auth is active');
        return;
      }

      // Handle special case for schema errors
      if (event === 'SIGNED_IN' && !session) {
        console.warn('Received SIGNED_IN event but no session, possible schema error');

        // Try to get user info directly
        supabase.auth.getUser().then(({ data, error }) => {
          if (error) {
            console.error('Error getting user after SIGNED_IN event:', error);
            return;
          }

          if (data && data.user) {
            console.log('Successfully retrieved user despite missing session');
            setUser(data.user);
            setIsCustomAuth(false);
            setIsLoading(false);
          }
        }).catch(error => {
          console.error('Exception getting user after SIGNED_IN event:', error);
        });

        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Also set up a listener for localStorage changes to detect custom auth changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        console.log('Custom auth state changed');
        if (e.newValue) {
          try {
            const customUser = JSON.parse(e.newValue);
            setUser(customUser);
            setIsCustomAuth(true);
            setSession(null);
          } catch (error) {
            console.error('Error parsing user from localStorage:', error);
          }
        } else {
          // If custom user was removed and we were using custom auth, reset state
          if (isCustomAuth) {
            setUser(null);
            setIsCustomAuth(false);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      console.log('Unsubscribing from auth changes');
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isCustomAuth]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isCustomAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};