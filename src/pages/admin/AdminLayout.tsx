import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, Plus, Settings, Users, LogOut, ShoppingBag, Mail, Settings as SettingsIcon, ShoppingCart, LayoutGrid, AtSign, AlertTriangle, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdminNotifications } from '../../context/AdminNotificationsContext';
import { NotificationBadge } from '../../components/admin/NotificationBadge';
import { getHighlightedUsersCount } from '../../utils/highlightedUsersStorage';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { notificationCounts, fetchNotificationCounts } = useAdminNotifications();

  // State for highlighted users count from localStorage
  const [highlightedCount, setHighlightedCount] = useState(getHighlightedUsersCount());

  // Update the highlighted count whenever it changes in localStorage
  useEffect(() => {
    const updateHighlightedCount = () => {
      const count = getHighlightedUsersCount();
      console.log(`AdminLayout: Highlighted users count from localStorage: ${count}`);
      setHighlightedCount(count);
    };

    // Update immediately
    updateHighlightedCount();

    // Set up an interval to check for changes
    const intervalId = setInterval(updateHighlightedCount, 1000);

    // Clean up
    return () => clearInterval(intervalId);
  }, []);

  // Fetch notification counts when the component mounts
  useEffect(() => {
    console.log('AdminLayout mounted, fetching notification counts...');
    console.log('Current notification counts:', notificationCounts);

    // Force an immediate fetch
    fetchNotificationCounts().then(() => {
      console.log('Initial notification counts fetched:', notificationCounts);

      // Log the current state after a short delay to ensure state is updated
      setTimeout(() => {
        console.log('Notification counts after delay:', notificationCounts);
      }, 1000);
    });

    // Set up an interval to fetch notification counts every 5 seconds
    const intervalId = setInterval(() => {
      console.log('Refreshing notification counts...');
      fetchNotificationCounts().then(() => {
        console.log('Updated notification counts:', notificationCounts);
      });
    }, 5000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [fetchNotificationCounts]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/admin/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Navigate anyway as a fallback
      navigate('/admin/login');
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/products/new', label: 'Add Product', icon: Plus },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/admin/storefront', label: 'StoreFront', icon: LayoutGrid },
    { path: '/admin/inquiries', label: 'Inquiries', icon: Mail },
    { path: '/admin/mailing-list', label: 'Mailing List', icon: AtSign },
    { path: '/admin/users', label: 'User Management', icon: Users },
    { path: '/admin/reviews', label: 'Reviews', icon: Star },
    { path: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Main site navigation - this is the top navbar from the main site */}
      {/* We leave space for this at the top */}
      <div className="h-16 flex-shrink-0"></div>

      {/* Admin Header - positioned directly below the main navbar */}
      <header className="bg-white fixed top-16 left-0 right-0 z-40 border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/admin" className="text-xl font-bold text-black py-4">
                Admin Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-sm text-gray-600 hover:text-black">
                View Store
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center text-sm text-gray-600 hover:text-black"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 fixed left-0 top-32 bottom-0 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium relative
                    ${isActive(item.path)
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                    }
                  `}
                >
                  <div className="relative">
                    <Icon className="w-4 h-4" />
                    {/* Add notification badges for specific tabs */}
                    {item.path === '/admin/orders' && notificationCounts.orders > 0 && (
                      <NotificationBadge count={notificationCounts.orders} />
                    )}
                    {item.path === '/admin/inquiries' && notificationCounts.inquiries > 0 && (
                      <NotificationBadge count={notificationCounts.inquiries} />
                    )}
                    {item.path === '/admin/mailing-list' && notificationCounts.mailingList > 0 && (
                      <NotificationBadge count={notificationCounts.mailingList} />
                    )}

                    {item.path === '/admin/reviews' && notificationCounts.reviews > 0 && (
                      <NotificationBadge count={notificationCounts.reviews} />
                    )}

                    {/* Show the users notification badge when there are highlighted notifications */}
                    {item.path === '/admin/users' && (
                      <>
                        {/* Use the highlighted count from localStorage */}
                        <NotificationBadge count={highlightedCount} />
                        {/* Debug info */}
                        {console.log(`Users tab notification count from localStorage: ${highlightedCount}`)}
                      </>
                    )}
                  </div>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content - Only this should scroll */}
        <main className="flex-1 ml-64 p-8 bg-white overflow-y-auto h-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};