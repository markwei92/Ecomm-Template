import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { useAdminNotifications } from '../../context/AdminNotificationsContext';
import {
  getHighlightedUsers,
  isUserHighlighted,
  toggleHighlightedUser,
  getHighlightedUsersCount,
  setAllUsersHighlighted,
  clearHighlightedUsers
} from '../../utils/highlightedUsersStorage';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string | null;
  gender: string | null;
  default_street: string | null;
  default_city: string | null;
  default_state: string | null;
  default_country: string | null;
  default_postal_code: string | null;
  cart_items_count: number;
  total_items_in_cart: number;
  cart_value: number;
  registered_at: string;
  is_new?: boolean;
  highlighted?: boolean; // Added for the new highlighting system
  display_name?: string; // Added for fallback display
}

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof User>('registered_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 25;
  const {
    markUsersAsViewed,
    markUserAsViewed,
    notificationCounts,
    fetchNotificationCounts,
    toggleUserHighlighted
  } = useAdminNotifications();

  // Fetch users when component mounts or when filters change
  useEffect(() => {
    fetchUsers();
  }, [currentPage, sortField, sortOrder, selectedCountry]);

  // Add a separate effect to refresh the user list when notification counts change
  // But only if we're not already loading data
  useEffect(() => {
    if (notificationCounts.users > 0 && !isLoading) {
      console.log('User notifications detected, refreshing user list');
      // Use a debounce to prevent too frequent refreshes
      const timeoutId = setTimeout(() => {
        fetchUsers();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [notificationCounts.users, isLoading]);

  // Mark all users as viewed when leaving the page
  useEffect(() => {
    return () => {
      // Only mark as viewed if there are notifications
      if (notificationCounts.users > 0) {
        console.log('Leaving UserList page, marking all users as viewed');
        markUsersAsViewed();
      }
    };
  }, [markUsersAsViewed, notificationCounts.users]);

  // Force a refresh when the component mounts
  useEffect(() => {
    console.log('UserList component mounted, forcing refresh');
    fetchNotificationCounts();
    fetchUsers();

    // Check for unviewed notifications directly
    const checkUnviewedNotifications = async () => {
      try {
        const { data: unviewedNotifications, error } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('viewed', false);

        if (error) {
          console.error('Error checking unviewed notifications:', error);
          return;
        }

        if (unviewedNotifications && unviewedNotifications.length > 0) {
          console.log('Found unviewed notifications:', unviewedNotifications);

          // Force update notification counts
          const newCount = unviewedNotifications.length;
          console.log(`Setting user notification count to ${newCount}`);

          // Store in localStorage
          const currentCounts = JSON.parse(localStorage.getItem('admin_notification_counts') || '{"orders":0,"inquiries":0,"users":0}');
          const newCounts = { ...currentCounts, users: newCount };
          localStorage.setItem('admin_notification_counts', JSON.stringify(newCounts));

          // Update the notification context
          fetchNotificationCounts();
        }
      } catch (error) {
        console.error('Error in checkUnviewedNotifications:', error);
      }
    };

    // Run the check
    checkUnviewedNotifications();
  }, []);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('admin_user_view')
        .select('*', { count: 'exact' });

      // Apply filters
      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
      }

      if (selectedCountry) {
        query = query.eq('default_country', selectedCountry);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const start = (currentPage - 1) * usersPerPage;
      query = query.range(start, start + usersPerPage - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Get highlighted users from localStorage instead of database
      let highlightedUserIds = getHighlightedUsers();
      console.log('Users highlighted in localStorage:', highlightedUserIds);

      // Log the highlighted count for debugging
      console.log(`Found ${highlightedUserIds.length} highlighted users in localStorage`);

      // Update notification counts based on highlighted users
      if (notificationCounts.users !== highlightedUserIds.length) {
        console.log(`Updating notification count: ${notificationCounts.users} -> ${highlightedUserIds.length}`);
        setNotificationCounts(prev => ({
          ...prev,
          users: highlightedUserIds.length
        }));
      }

      // If we don't have any highlighted notifications, we'll create them in a batch operation
      if (highlightedUserIds.length === 0) {
        console.log('No highlighted notifications found, will create them via RPC');

        try {
          // Use the RPC function to create notifications for the latest users
          const { data: result, error } = await supabase.rpc('create_notifications_for_latest_users', {
            limit_count: 10
          });

          if (error) {
            console.error('Error creating notifications:', error);
          } else {
            console.log(`Created ${result} new notifications`);

            // Fetch the newly created notifications
            const { data: newNotifications } = await supabase
              .from('user_notifications')
              .select('user_id')
              .eq('highlighted', true);

            if (newNotifications && newNotifications.length > 0) {
              highlightedUserIds = newNotifications.map(n => n.user_id);
              console.log('Fetched highlighted user IDs:', highlightedUserIds);
            }
          }
        } catch (error) {
          console.error('Error in batch notification creation:', error);
        }
      }

      // Remove duplicate users (in case a user exists in both auth.users and public.users)
      const uniqueUsers = [];
      const userIds = new Set();

      (data || []).forEach(user => {
        if (!userIds.has(user.id)) {
          userIds.add(user.id);
          uniqueUsers.push(user);
        }
      });

      // For users with missing names, fetch from profiles, public.users, or auth.users metadata
      const usersWithMissingNames = uniqueUsers.filter(user => !user.first_name && !user.last_name);

      if (usersWithMissingNames.length > 0) {
        console.log('Fetching missing names for users:', usersWithMissingNames.map(u => u.id));

        // First try to get names from profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', usersWithMissingNames.map(u => u.id));

        // Then try to get names from public.users
        const { data: publicUsersData } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', usersWithMissingNames.map(u => u.id));

        // Try to get metadata from auth.users using RPC
        const { data: metadataData, error: metadataError } = await supabase.rpc('get_user_metadata_batch', {
          user_ids: usersWithMissingNames.map(u => u.id)
        });

        if (metadataError) {
          console.error('Error fetching user metadata:', metadataError);
        } else {
          console.log('Fetched metadata for users:', metadataData);
        }

        // Update users with names from profiles, public.users, or metadata
        uniqueUsers.forEach(user => {
          const profile = profilesData?.find(p => p.id === user.id);
          const publicUser = publicUsersData?.find(p => p.id === user.id);
          const metadata = metadataData?.find(m => m.user_id === user.id);

          if (profile && (profile.first_name || profile.last_name)) {
            user.first_name = profile.first_name;
            user.last_name = profile.last_name;
            console.log(`Updated user ${user.id} with name from profile: ${profile.first_name} ${profile.last_name}`);
          } else if (publicUser && (publicUser.first_name || publicUser.last_name)) {
            user.first_name = publicUser.first_name;
            user.last_name = publicUser.last_name;
            console.log(`Updated user ${user.id} with name from public.users: ${publicUser.first_name} ${publicUser.last_name}`);
          } else if (metadata && (metadata.first_name || metadata.last_name)) {
            user.first_name = metadata.first_name;
            user.last_name = metadata.last_name;
            console.log(`Updated user ${user.id} with name from metadata: ${metadata.first_name} ${metadata.last_name}`);
          } else {
            // Use email username as fallback for display purposes
            const emailUsername = user.email.split('@')[0];
            // Only set these for display, not for database updates
            if (!user.first_name) {
              user.display_name = emailUsername;
            }
          }
        });
      }

      // Get all user IDs
      const allUserIds = uniqueUsers.map(user => user.id);

      // Only set all users as highlighted if there are no highlighted users yet
      const currentHighlightedUsers = getHighlightedUsers();
      if (allUserIds.length > 0 && currentHighlightedUsers.length === 0) {
        console.log('No highlighted users found, setting all users as highlighted by default');
        setAllUsersHighlighted(allUserIds);
      }

      // Use localStorage to determine highlighted status
      const usersWithHighlightedStatus = uniqueUsers.map(user => {
        // Check if this user is in localStorage
        const isHighlighted = isUserHighlighted(user.id);

        return {
          ...user,
          // Use the state from localStorage, not forcing all to be highlighted
          highlighted: isHighlighted
        };
      });

      setUsers(usersWithHighlightedStatus);
      setTotalUsers(count || 0);

      // Don't mark user notifications as viewed automatically
      // Let the user click on each item to mark it as viewed
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: keyof User) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const exportUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_user_view')
        .select('*')
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) throw error;

      const csv = [
        // CSV Headers
        ['Email', 'First Name', 'Last Name', 'Phone', 'Country', 'Cart Items', 'Cart Value', 'Registered'].join(','),
        // CSV Data
        ...data.map(user => [
          user.email,
          user.first_name || '',
          user.last_name || '',
          user.phone || '',
          user.default_country || '',
          user.cart_items_count,
          user.cart_value.toFixed(2),
          new Date(user.registered_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting users:', error);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to delete the user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_user', { user_id: userId });

      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and monitor user accounts, including personal information and shopping activity
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex space-x-2">
          <button
            onClick={async () => {
              try {
                // Create notifications for the latest users
                const { data, error } = await supabase.rpc('create_notifications_for_latest_users', {
                  limit_count: 10
                });

                if (error) {
                  console.error('Error creating notifications:', error);
                  toast.error('Failed to create notifications');
                } else {
                  console.log('Created notifications:', data);
                  toast.success(`Created ${data} new notifications`);
                  // Refresh notification counts
                  fetchNotificationCounts();
                  // Refresh user list
                  fetchUsers();
                }
              } catch (error) {
                console.error('Error creating notifications:', error);
                toast.error('Failed to create notifications');
              }
            }}
            className="flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Refresh Notifications
          </button>

          <button
            onClick={exportUsers}
            className="flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Users
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => {
                // Get all user IDs
                const allUserIds = users.map(user => user.id);

                // Set all users as highlighted in localStorage
                setAllUsersHighlighted(allUserIds);

                // Update all users in the UI
                setUsers(users.map(user => ({ ...user, highlighted: true })));

                // Update notification count
                setNotificationCounts(prev => ({
                  ...prev,
                  users: allUserIds.length
                }));

                // Also update in the database for consistency
                allUserIds.forEach(userId => {
                  toggleUserHighlighted(userId, true);
                });

                // Log the current state for debugging
                console.log('Current highlighted users in localStorage after highlighting all:', getHighlightedUsers());

                toast.success(`Highlighted all ${allUserIds.length} users`);
              }}
              className="flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Highlight All
            </button>

            <button
              onClick={() => {
                // Clear all highlighted users in localStorage
                clearHighlightedUsers();

                // Update all users in the UI
                setUsers(users.map(user => ({ ...user, highlighted: false })));

                // Update notification count
                setNotificationCounts(prev => ({
                  ...prev,
                  users: 0
                }));

                // Also update in the database for consistency
                users.forEach(user => {
                  toggleUserHighlighted(user.id, false);
                });

                // Log the current state for debugging
                console.log('Cleared all highlighted users in localStorage');

                toast.success('Cleared all highlighted users');
              }}
              className="flex items-center justify-center rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Clear All Highlights
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          >
            <option value="">All Countries</option>
            {Array.from(new Set(users.map(u => u.default_country).filter(Boolean))).map(country => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        User
                        {sortField === 'email' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('default_country')}
                    >
                      <div className="flex items-center">
                        Location
                        {sortField === 'default_country' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('cart_value')}
                    >
                      <div className="flex items-center">
                        Cart
                        {sortField === 'cart_value' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('registered_at')}
                    >
                      <div className="flex items-center">
                        Registered
                        {sortField === 'registered_at' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-sm text-gray-500 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-sm text-gray-500 text-center">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className={user.highlighted ? 'new-item-highlight' : 'hover:bg-gray-50'}
                        data-highlighted={user.highlighted ? 'true' : 'false'}
                      >
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.first_name || ''} {user.last_name || ''}
                              {!user.first_name && !user.last_name && (
                                <span className="italic text-gray-500">
                                  {user.display_name || user.email.split('@')[0]} {/* Use display_name or email username as fallback */}
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500">{user.email}</div>
                            {user.phone && (
                              <div className="text-gray-500">{user.phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {user.default_country ? (
                            <div>
                              <div>{user.default_street}</div>
                              <div>{user.default_city}, {user.default_state}</div>
                              <div>{user.default_postal_code}</div>
                              <div>{user.default_country}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div>
                            <div>{user.cart_items_count} items</div>
                            <div className="text-gray-900 font-medium">
                              ${user.cart_value.toFixed(2)}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(user.registered_at).toLocaleDateString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-6 flex items-center justify-end space-x-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`highlight-${user.id}`}
                              checked={user.highlighted || false}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                console.log(`Toggling highlight for user ${user.id} to ${isChecked}`);

                                // First update the highlighted state in localStorage
                                toggleHighlightedUser(user.id, isChecked);

                                // Update the user in the local state immediately to prevent UI flicker
                                setUsers(prevUsers =>
                                  prevUsers.map(u =>
                                    u.id === user.id ? { ...u, highlighted: isChecked } : u
                                  )
                                );

                                // Also update in the database for consistency
                                toggleUserHighlighted(user.id, isChecked);

                                // Update notification counts based on localStorage
                                const newCount = getHighlightedUsersCount();
                                console.log(`Setting notification count to ${newCount} based on localStorage`);
                                setNotificationCounts(prev => ({
                                  ...prev,
                                  users: newCount
                                }));

                                // Log the current state for debugging
                                console.log('Current highlighted users in localStorage:', getHighlightedUsers());

                                // Prevent event propagation
                                e.stopPropagation();
                              }}
                              className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                            />
                            <label htmlFor={`highlight-${user.id}`} className="ml-2 text-sm text-gray-600">
                              Highlight
                            </label>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user.id, user.email);
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors duration-200"
                            title="Delete user"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((currentPage - 1) * usersPerPage) + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * usersPerPage, totalUsers)}
                </span>{' '}
                of <span className="font-medium">{totalUsers}</span> users
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronDown className="h-5 w-5 rotate-90" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    const distance = Math.abs(page - currentPage);
                    return distance === 0 || distance === 1 || page === 1 || page === totalPages;
                  })
                  .map((page, index, array) => {
                    if (index > 0 && array[index - 1] !== page - 1) {
                      return [
                        <span
                          key={`ellipsis-${page}`}
                          className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                        >
                          ...
                        </span>,
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                            ? 'z-10 bg-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                            }`}
                        >
                          {page}
                        </button>
                      ];
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                          ? 'z-10 bg-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">Next</span>
                  <ChevronDown className="h-5 w-5 -rotate-90" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};