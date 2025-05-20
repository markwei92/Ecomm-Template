import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';

export const ProtectedAdminRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking admin authentication...');

        // Check if user is authenticated
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          console.log('No active session found');
          setIsAuthenticated(false);
          return;
        }

        console.log('User is authenticated, checking admin status...');

        // Get current user
        const { data: user } = await supabase.auth.getUser();

        if (!user || !user.user) {
          console.log('No user data found');
          setIsAuthenticated(false);
          return;
        }

        console.log('User ID:', user.user.id);

        // Check for admin role in admin_users table
        const { data: adminCheck, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.user.id)
          .single();

        if (adminError) {
          console.error('Error checking admin status:', adminError);
          console.log('User is not an admin - access denied');
          setIsAuthenticated(false);
          return;
        }

        if (!adminCheck) {
          console.log('User is not an admin - access denied');
          setIsAuthenticated(false);
          return;
        }

        console.log('User is confirmed as admin');
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto text-gray-500" />
          <p className="mt-2 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // TEMPORARY FIX: If authenticated, render the protected content
  // This bypasses the admin check
  return <Outlet />;
};
