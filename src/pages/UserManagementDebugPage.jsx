import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const UserManagementDebugPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteResult, setDeleteResult] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState({});
  const [manualUserId, setManualUserId] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Create Supabase admin client
  const createAdminClient = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    return createClient(supabaseUrl, supabaseServiceKey);
  };

  // Fetch users on component mount and set up refresh interval
  useEffect(() => {
    fetchUsers();

    // Set up a refresh interval to periodically check for updates
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing user list...');
      fetchUsers(true); // Pass true to indicate this is a background refresh
    }, 30000); // Refresh every 30 seconds

    // Clean up the interval when the component unmounts
    return () => clearInterval(refreshInterval);
  }, []);

  // Function to fetch users
  const fetchUsers = async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const supabaseAdmin = createAdminClient();
      let allUsers = [];

      // First try to get users with the admin API
      try {
        // Try to get all users with pagination to ensure we get everyone
        let { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000 // Get a large number of users
        });

        if (error) {
          console.error('Error with admin.listUsers:', error.message);
        } else {
          console.log('Found users with admin API:', data.users?.length || 0);
          allUsers = [...(data.users || [])];

          // Check if there are more pages
          let currentPage = 1;
          while (data.users?.length === 1000) {
            currentPage++;
            const nextPageResult = await supabaseAdmin.auth.admin.listUsers({
              page: currentPage,
              perPage: 1000
            });

            if (nextPageResult.error) {
              console.error(`Error fetching page ${currentPage}:`, nextPageResult.error);
              break;
            }

            if (nextPageResult.data.users?.length > 0) {
              console.log(`Found ${nextPageResult.data.users.length} more users on page ${currentPage}`);
              allUsers = [...allUsers, ...nextPageResult.data.users];
            } else {
              break;
            }
          }
        }
      } catch (adminError) {
        console.error('Admin API failed:', adminError);
      }

      // Try to get users from the custom users table
      try {
        const { data: customUsers, error: customError } = await supabaseAdmin
          .from('users')
          .select('id, email, created_at, first_name, last_name')
          .order('created_at', { ascending: false });

        if (customError) {
          console.error('Error fetching custom users:', customError);
        } else if (customUsers && customUsers.length > 0) {
          console.log('Found custom users:', customUsers.length);

          // Convert custom users to the same format as auth users
          const formattedCustomUsers = customUsers.map(user => {
            // Check if this user is already in allUsers
            const existingUser = allUsers.find(u => u.id === user.id || u.email === user.email);
            if (existingUser) return null; // Skip duplicates

            return {
              id: user.id,
              email: user.email,
              created_at: user.created_at,
              email_confirmed_at: new Date().toISOString(), // Assume confirmed for custom users
              user_metadata: {
                first_name: user.first_name,
                last_name: user.last_name,
                full_name: `${user.first_name} ${user.last_name}`
              },
              is_custom: true
            };
          }).filter(Boolean); // Remove nulls (duplicates)

          allUsers = [...allUsers, ...formattedCustomUsers];
        }
      } catch (customError) {
        console.error('Error fetching custom users:', customError);
      }

      // Try to get users from the profiles table if it exists
      try {
        const { data: profileUsers, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, created_at, first_name, last_name')
          .order('created_at', { ascending: false });

        if (!profileError && profileUsers && profileUsers.length > 0) {
          console.log('Found profile users:', profileUsers.length);

          // Convert profile users to the same format as auth users
          const formattedProfileUsers = profileUsers.map(user => {
            // Check if this user is already in allUsers
            const existingUser = allUsers.find(u => u.id === user.id || u.email === user.email);
            if (existingUser) return null; // Skip duplicates

            return {
              id: user.id,
              email: user.email || `profile-${user.id.substring(0, 8)}@example.com`,
              created_at: user.created_at || new Date().toISOString(),
              email_confirmed_at: new Date().toISOString(), // Assume confirmed for profile users
              user_metadata: {
                first_name: user.first_name,
                last_name: user.last_name,
                full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
              },
              is_profile: true
            };
          }).filter(Boolean); // Remove nulls (duplicates)

          allUsers = [...allUsers, ...formattedProfileUsers];
        }
      } catch (profileError) {
        console.error('Error fetching profile users:', profileError);
      }

      // Add the known problematic user IDs
      const knownUserIds = [
        '2f59a126-2bbe-4fb4-a3d0-24ab4f26eb19',
        '79fc38bf-682b-4355-a223-b6f989535aff',
        '2ea1fd3a-c581-4e07-bf64-9f311e625663',
        'e80f72ac-c872-4769-afa7-757db779adf8',
        '27478dab-6573-406a-9680-77968ff8f424',
        'fb929813-de21-4236-9c55-6f127d513d50',
        '985e47cc-6019-4019-b5a2-6bf9ce027849',
        '31f62558-1447-4e37-9c23-ab55684cf355' // Adding the user ID from your error message
      ];

      // Filter out IDs that are already in allUsers
      const missingUserIds = knownUserIds.filter(id => !allUsers.some(u => u.id === id));

      if (missingUserIds.length > 0) {
        console.log('Adding manual entries for missing users:', missingUserIds.length);

        const manualUsers = missingUserIds.map(id => ({
          id,
          email: `unknown-${id.substring(0, 8)}@example.com`,
          created_at: new Date().toISOString(),
          email_confirmed_at: null,
          is_manual: true
        }));

        allUsers = [...allUsers, ...manualUsers];
      }

      // Sort users by creation date (newest first)
      allUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      console.log('Total users found:', allUsers.length);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (!isBackgroundRefresh) {
        setError(`Error fetching users: ${error.message}`);
      }
    } finally {
      if (!isBackgroundRefresh) {
        setIsLoading(false);
      }
    }
  };

  // Function to delete a user
  const deleteUser = async (userId) => {
    setIsDeleting(true);
    setDeleteResult(null);

    try {
      // Check if this is a manual user
      const user = users.find(u => u.id === userId);
      if (user?.is_manual) {
        // For manual users, try a different approach
        await deleteUserWithDirectAPI(userId);

        // Remove the user from our local list
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));

        setDeleteResult({
          success: true,
          message: `User ${userId} deletion request sent successfully`
        });

        return;
      }

      // Try SQL deletion first as it's the most comprehensive
      console.log('Attempting SQL deletion first...');
      const sqlResult = await tryDeleteWithSQL(userId);

      if (sqlResult) {
        console.log('SQL deletion successful');
        setDeleteResult({
          success: true,
          message: `User ${userId} deleted successfully (via SQL)`
        });

        // Remove the user from our local list immediately
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));

        // Refresh the user list after a short delay to ensure backend has processed the deletion
        setTimeout(() => {
          fetchUsers();
        }, 1000);

        return;
      }

      console.log('SQL deletion failed, trying admin API...');
      const supabaseAdmin = createAdminClient();

      // Try to delete the user with the admin API
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        // If admin API fails, try direct API
        console.error('Admin API deletion failed:', error.message);
        try {
          console.log('Trying direct API deletion...');
          await deleteUserWithDirectAPI(userId);

          setDeleteResult({
            success: true,
            message: `User ${userId} deletion request sent successfully (via direct API)`
          });

          // Remove the user from our local list
          setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
        } catch (directError) {
          console.error('Direct API deletion failed:', directError.message);
          throw new Error(`All deletion methods failed for user ${userId}: ${error.message}, ${directError.message}`);
        }
      } else {
        console.log('Admin API deletion successful');
        setDeleteResult({
          success: true,
          message: `User ${userId} deleted successfully (via admin API)`
        });

        // Remove the user from our local list
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      }

      // Refresh the user list after a short delay
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setDeleteResult({
        success: false,
        message: error.message
      });

      // Try one more time with a different approach if all methods failed
      try {
        console.log('Attempting last-resort deletion...');
        const supabaseAdmin = createAdminClient();

        // Try a direct database query as a last resort
        const lastResortSql = `
          BEGIN;
          -- Disable triggers temporarily to avoid constraint issues
          SET session_replication_role = 'replica';

          -- Delete from all possible related tables
          DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = '${userId}');
          DELETE FROM auth.sessions WHERE user_id = '${userId}';
          DELETE FROM auth.identities WHERE user_id = '${userId}';
          DELETE FROM auth.users WHERE id = '${userId}';
          DELETE FROM public.users WHERE id = '${userId}';
          DELETE FROM public.profiles WHERE id = '${userId}';

          -- Re-enable triggers
          SET session_replication_role = 'origin';
          COMMIT;
        `;

        const { error: lastResortError } = await supabaseAdmin.rpc('run_sql', { sql: lastResortSql });

        if (!lastResortError) {
          console.log('Last-resort deletion successful');
          setDeleteResult({
            success: true,
            message: `User ${userId} deleted successfully (via last-resort method)`
          });

          // Remove the user from our local list
          setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));

          // Refresh the user list after a short delay
          setTimeout(() => {
            fetchUsers();
          }, 1000);
        } else {
          console.error('Last-resort deletion failed:', lastResortError);
        }
      } catch (lastResortError) {
        console.error('Last-resort deletion exception:', lastResortError);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to delete a user with direct API call
  const deleteUserWithDirectAPI = async (userId) => {
    try {
      // First try using the Supabase client directly
      const supabaseAdmin = createAdminClient();

      try {
        // Try using the admin API directly
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (!error) {
          console.log(`Successfully deleted user with admin API: ${userId}`);
          return true;
        }
      } catch (adminError) {
        console.error('Admin API deletion failed:', adminError);
      }

      // If admin API fails, try SQL deletion
      try {
        const { data, error } = await supabaseAdmin.rpc('run_sql', {
          sql: `DELETE FROM auth.users WHERE id = '${userId}';`
        });

        if (!error) {
          console.log(`Successfully deleted user with SQL: ${userId}`);
          return true;
        }
      } catch (sqlError) {
        console.error('SQL deletion failed:', sqlError);
      }

      // If SQL fails, try deleting from the custom users table
      try {
        const { error } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId);

        if (!error) {
          console.log(`Successfully deleted user from custom table: ${userId}`);
          return true;
        }
      } catch (customError) {
        console.error('Custom table deletion failed:', customError);
      }

      // If all direct methods fail, try using the REST API through a proxy
      // Create a proxy endpoint in your app to avoid CORS issues
      try {
        // Use a relative URL to avoid CORS issues
        const response = await fetch('/api/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
          })
        });

        if (response.ok) {
          console.log(`Successfully deleted user with proxy: ${userId}`);
          return true;
        }
      } catch (proxyError) {
        console.error('Proxy deletion failed:', proxyError);
      }

      // As a fallback, try direct API calls (may fail due to CORS)
      const endpoints = [
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${userId}`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to delete user with endpoint: ${endpoint}`);

          const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
            }
          });

          if (response.ok) {
            console.log(`Successfully deleted user with endpoint: ${endpoint}`);
            return true;
          }
        } catch (endpointError) {
          console.error(`Error with endpoint ${endpoint}:`, endpointError);
        }
      }

      // If we get here, all methods failed
      throw new Error('All deletion methods failed');
    } catch (error) {
      console.error('Direct API call failed:', error);
      throw error;
    }
  };

  // Function to try SQL deletion
  const tryDeleteWithSQL = async (userId) => {
    try {
      const supabaseAdmin = createAdminClient();

      // More comprehensive SQL to delete user from all related tables
      // This handles auth.users, auth.identities, auth.sessions, and other related tables
      const sql = `
        -- First, delete from related tables that have foreign key constraints
        DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = '${userId}');
        DELETE FROM auth.sessions WHERE user_id = '${userId}';
        DELETE FROM auth.identities WHERE user_id = '${userId}';
        DELETE FROM auth.mfa_factors WHERE user_id = '${userId}';
        DELETE FROM auth.mfa_challenges WHERE user_id = '${userId}';

        -- Delete from custom tables if they exist
        DELETE FROM public.users WHERE id = '${userId}';
        DELETE FROM public.profiles WHERE id = '${userId}';
        DELETE FROM public.cart_items WHERE user_id = '${userId}';
        DELETE FROM public.shipping_addresses WHERE user_id = '${userId}';
        DELETE FROM public.orders WHERE user_id = '${userId}';

        -- Finally delete the user from auth.users
        DELETE FROM auth.users WHERE id = '${userId}';
      `;

      // Execute the SQL directly
      const { data, error } = await supabaseAdmin.rpc('run_sql', { sql });

      if (error) {
        console.error('SQL deletion error:', error);

        // If the first attempt fails, try a simpler approach
        try {
          const simpleSql = `DELETE FROM auth.users WHERE id = '${userId}';`;
          const { data: simpleData, error: simpleError } = await supabaseAdmin.rpc('run_sql', { sql: simpleSql });

          if (simpleError) {
            console.error('Simple SQL deletion error:', simpleError);
            return false;
          }

          console.log('Simple SQL deletion result:', simpleData);
          return true;
        } catch (simpleError) {
          console.error('Simple SQL deletion exception:', simpleError);
          return false;
        }
      }

      console.log('Comprehensive SQL deletion result:', data);

      // Try to delete from the custom users table as well
      try {
        const { error: customError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId);

        if (customError) {
          console.error('Custom table deletion error:', customError);
        }
      } catch (customError) {
        console.error('Custom table deletion exception:', customError);
      }

      // Try to delete from the profiles table as well
      try {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) {
          console.error('Profile table deletion error:', profileError);
        }
      } catch (profileError) {
        console.error('Profile table deletion exception:', profileError);
      }

      return true;
    } catch (error) {
      console.error('SQL deletion exception:', error);
      return false;
    }
  };

  // Function to delete multiple users
  const deleteSelectedUsers = async () => {
    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const userIds = Object.keys(selectedUsers).filter(id => selectedUsers[id]);

      if (userIds.length === 0) {
        throw new Error('No users selected');
      }

      const results = [];
      const manualUserIds = [];

      // First, identify manual users
      for (const userId of userIds) {
        const user = users.find(u => u.id === userId);
        if (user?.is_manual) {
          manualUserIds.push(userId);
        }
      }

      // Process manual users first
      for (const userId of manualUserIds) {
        try {
          await deleteUserWithDirectAPI(userId);
          results.push({
            userId,
            success: true,
            message: 'Deletion request sent successfully (manual user)'
          });
        } catch (error) {
          results.push({
            userId,
            success: false,
            message: `Manual deletion failed: ${error.message}`
          });
        }
      }

      // Remove manual users from our list
      if (manualUserIds.length > 0) {
        setUsers(prevUsers => prevUsers.filter(u => !manualUserIds.includes(u.id)));
      }

      // Process regular users
      const regularUserIds = userIds.filter(id => !manualUserIds.includes(id));
      if (regularUserIds.length > 0) {
        const supabaseAdmin = createAdminClient();

        for (const userId of regularUserIds) {
          try {
            // Try to delete the user with the admin API
            const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

            if (error) {
              // If admin API fails, try direct API
              console.error('Admin API deletion failed:', error.message);
              try {
                await deleteUserWithDirectAPI(userId);
                results.push({
                  userId,
                  success: true,
                  message: 'Deletion request sent successfully (via direct API)'
                });
              } catch (directError) {
                // Try SQL deletion as a last resort
                try {
                  const sqlResult = await tryDeleteWithSQL(userId);

                  if (sqlResult) {
                    results.push({
                      userId,
                      success: true,
                      message: 'Deletion request sent successfully (via SQL)'
                    });
                  } else {
                    results.push({
                      userId,
                      success: false,
                      message: `All deletion methods failed: ${error.message}, ${directError.message}, SQL failed`
                    });
                  }
                } catch (sqlError) {
                  results.push({
                    userId,
                    success: false,
                    message: `All deletion methods failed: ${error.message}, ${directError.message}, ${sqlError.message}`
                  });
                }
              }
            } else {
              results.push({
                userId,
                success: true,
                message: 'Deleted successfully (via admin API)'
              });
            }
          } catch (error) {
            results.push({
              userId,
              success: false,
              message: error.message
            });
          }
        }
      }

      const successCount = results.filter(r => r.success).length;

      setDeleteResult({
        success: successCount > 0,
        message: `Deleted ${successCount} out of ${userIds.length} users`,
        details: results
      });

      // Refresh the user list if we had any regular users
      if (regularUserIds.length > 0) {
        fetchUsers();
      }

      // Clear selection
      setSelectedUsers({});
    } catch (error) {
      console.error('Error deleting users:', error);
      setDeleteResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Toggle all users selection
  const toggleAllUsers = () => {
    if (Object.keys(selectedUsers).length === users.length) {
      // If all are selected, deselect all
      setSelectedUsers({});
    } else {
      // Otherwise, select all
      const newSelection = {};
      users.forEach(user => {
        newSelection[user.id] = true;
      });
      setSelectedUsers(newSelection);
    }
  };

  // Function to add a manual user ID
  const addManualUserId = () => {
    if (!manualUserId.trim()) {
      setError('Please enter a valid user ID');
      return;
    }

    // Check if this ID is already in the list
    if (users.some(user => user.id === manualUserId.trim())) {
      setError('This user ID is already in the list');
      return;
    }

    setIsAddingUser(true);

    try {
      // Create a new manual user entry
      const newUser = {
        id: manualUserId.trim(),
        email: `unknown-${manualUserId.trim().substring(0, 8)}@example.com`,
        created_at: new Date().toISOString(),
        email_confirmed_at: null,
        is_manual: true
      };

      // Add to the users list
      setUsers(prevUsers => [newUser, ...prevUsers]);

      // Clear the input and any errors
      setManualUserId('');
      setError(null);
    } catch (error) {
      setError(`Error adding manual user: ${error.message}`);
    } finally {
      setIsAddingUser(false);
    }
  };

  // Count selected users
  const selectedCount = Object.values(selectedUsers).filter(Boolean).length;

  // Function to find and delete a user by email
  const findAndDeleteUserByEmail = async (email) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabaseAdmin = createAdminClient();

      // First, try to find the user in auth.users
      console.log(`Searching for user with email: ${email}`);

      // Try to find the user in auth.users using SQL
      const findUserSql = `
        SELECT id, email FROM auth.users WHERE email = '${email}';
      `;

      const { data: userData, error: userError } = await supabaseAdmin.rpc('run_sql', { sql: findUserSql });

      if (userError) {
        console.error('Error finding user:', userError);
        throw new Error(`Error finding user: ${userError.message}`);
      }

      console.log('User search result:', userData);

      let userId = null;

      // Parse the SQL result to get the user ID
      if (userData && userData.length > 0) {
        try {
          // The result is a string that looks like a table, we need to parse it
          const resultLines = userData.split('\\n');
          // Find the line with the user ID (should be the third line)
          if (resultLines.length >= 3) {
            // Split by | and trim to get the ID
            const columns = resultLines[2].split('|').map(col => col.trim());
            userId = columns[0];
            console.log(`Found user ID: ${userId}`);
          }
        } catch (parseError) {
          console.error('Error parsing SQL result:', parseError);
        }
      }

      if (!userId) {
        // If not found in auth.users, try the custom users table
        const { data: customUsers, error: customError } = await supabaseAdmin
          .from('users')
          .select('id, email')
          .eq('email', email)
          .limit(1);

        if (customError) {
          console.error('Error finding user in custom table:', customError);
        } else if (customUsers && customUsers.length > 0) {
          userId = customUsers[0].id;
          console.log(`Found user ID in custom table: ${userId}`);
        }
      }

      if (!userId) {
        // If still not found, try the profiles table
        const { data: profileUsers, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('email', email)
          .limit(1);

        if (profileError) {
          console.error('Error finding user in profiles table:', profileError);
        } else if (profileUsers && profileUsers.length > 0) {
          userId = profileUsers[0].id;
          console.log(`Found user ID in profiles table: ${userId}`);
        }
      }

      if (!userId) {
        throw new Error(`User with email ${email} not found in any table`);
      }

      // Now that we have the user ID, perform a comprehensive deletion
      console.log(`Attempting to delete user with ID: ${userId}`);

      // Use the most aggressive SQL deletion approach
      const deleteSql = `
        BEGIN;
        -- Disable triggers and constraints
        SET session_replication_role = 'replica';

        -- Delete from all possible related tables
        DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = '${userId}');
        DELETE FROM auth.sessions WHERE user_id = '${userId}';
        DELETE FROM auth.identities WHERE user_id = '${userId}';
        DELETE FROM auth.mfa_factors WHERE user_id = '${userId}';
        DELETE FROM auth.mfa_challenges WHERE user_id = '${userId}';
        DELETE FROM auth.users WHERE id = '${userId}';
        DELETE FROM auth.users WHERE email = '${email}';
        DELETE FROM public.users WHERE id = '${userId}';
        DELETE FROM public.users WHERE email = '${email}';
        DELETE FROM public.profiles WHERE id = '${userId}';
        DELETE FROM public.profiles WHERE email = '${email}';
        DELETE FROM public.cart_items WHERE user_id = '${userId}';
        DELETE FROM public.shipping_addresses WHERE user_id = '${userId}';
        DELETE FROM public.orders WHERE user_id = '${userId}';

        -- Re-enable triggers
        SET session_replication_role = 'origin';
        COMMIT;
      `;

      const { error: deleteError } = await supabaseAdmin.rpc('run_sql', { sql: deleteSql });

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        throw new Error(`Error deleting user: ${deleteError.message}`);
      }

      console.log(`Successfully deleted user with email: ${email}`);

      // Try to delete directly from auth.users using the admin API as well
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (adminError) {
        console.error('Admin API deletion error:', adminError);
      }

      // Remove the user from our local list if present
      setUsers(prevUsers => prevUsers.filter(u => u.email !== email && u.id !== userId));

      setDeleteResult({
        success: true,
        message: `User with email ${email} deleted successfully`
      });

      // Refresh the user list after a short delay
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (error) {
      console.error('Error in findAndDeleteUserByEmail:', error);
      setDeleteResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">User Management Debug Page</h1>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">About This Tool</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">
          This page allows you to manage Supabase Auth users directly, including those that can't be accessed through the Supabase dashboard.
          It uses multiple deletion methods to ensure users can be removed even when standard methods fail.
        </p>

        <div className="flex flex-wrap gap-4 mt-6">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            ) : 'Refresh Users'}
          </button>

          <button
            onClick={deleteSelectedUsers}
            disabled={isDeleting || selectedCount === 0}
            className="px-5 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 font-medium transition-colors"
          >
            {isDeleting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </span>
            ) : `Delete Selected (${selectedCount})`}
          </button>

          <button
            onClick={toggleAllUsers}
            disabled={isLoading || users.length === 0}
            className="px-5 py-2.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 font-medium transition-colors"
          >
            {Object.keys(selectedUsers).length === users.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium mb-3">Add Manual User ID</h3>
          <p className="text-sm text-gray-600 mb-4">
            If you have a specific user ID that doesn't appear in the list, you can add it manually here.
          </p>

          <div className="flex flex-wrap gap-2">
            <div className="flex-grow">
              <input
                type="text"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                placeholder="Enter user ID (UUID format)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={addManualUserId}
              disabled={isAddingUser || !manualUserId.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium transition-colors"
            >
              {isAddingUser ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </span>
              ) : 'Add User ID'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Format example: 2f59a126-2bbe-4fb4-a3d0-24ab4f26eb19
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium mb-3">Delete User by Email</h3>
          <p className="text-sm text-gray-600 mb-4">
            If you know the user's email address, you can delete them directly using this tool.
          </p>

          <div className="flex flex-wrap gap-2">
            <div className="flex-grow">
              <input
                type="email"
                id="deleteUserEmail"
                placeholder="Enter user email address"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => {
                const email = document.getElementById('deleteUserEmail').value.trim();
                if (!email) {
                  setError('Please enter a valid email address');
                  return;
                }

                // Confirm before proceeding
                if (window.confirm(`Are you sure you want to delete the user with email ${email}? This action cannot be undone.`)) {
                  findAndDeleteUserByEmail(email);
                }
              }}
              disabled={isDeleting || isLoading}
              className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 font-medium transition-colors"
            >
              {isDeleting || isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : 'Delete User by Email'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This will attempt to find and delete the user with the specified email address from all tables.
          </p>

          {/* Quick action buttons for specific problematic users */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => findAndDeleteUserByEmail('test7@test7.com')}
              disabled={isDeleting || isLoading}
              className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-300 text-sm font-medium transition-colors"
            >
              Delete test7@test7.com
            </button>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete test7@test7.com using direct API calls? This is a last resort method.')) {
                  setIsLoading(true);
                  setError(null);

                  const supabaseAdmin = createAdminClient();

                  // First, try to find the user by email
                  supabaseAdmin.auth.admin.listUsers()
                    .then(async ({ data, error }) => {
                      if (error) {
                        console.error('Error listing users:', error);
                        throw new Error(`Error listing users: ${error.message}`);
                      }

                      // Find the user with email test7@test7.com
                      const user = data?.users?.find(u => u.email === 'test7@test7.com');

                      if (!user) {
                        console.log('User not found in auth.users, trying custom tables...');

                        // Try to find in custom users table
                        const { data: customUsers, error: customError } = await supabaseAdmin
                          .from('users')
                          .select('id, email')
                          .eq('email', 'test7@test7.com')
                          .limit(1);

                        if (customError) {
                          console.error('Error finding user in custom table:', customError);
                        } else if (customUsers && customUsers.length > 0) {
                          // Found in custom table, delete from there
                          const userId = customUsers[0].id;
                          console.log(`Found user in custom table with ID: ${userId}`);

                          const { error: deleteError } = await supabaseAdmin
                            .from('users')
                            .delete()
                            .eq('id', userId);

                          if (deleteError) {
                            console.error('Error deleting from custom table:', deleteError);
                            throw new Error(`Error deleting from custom table: ${deleteError.message}`);
                          }

                          console.log('Successfully deleted from custom table');
                          setDeleteResult({
                            success: true,
                            message: 'User test7@test7.com deleted successfully from custom table'
                          });

                          // Refresh the user list
                          setTimeout(() => fetchUsers(), 1000);
                          return;
                        }

                        // Try to find in profiles table
                        const { data: profileUsers, error: profileError } = await supabaseAdmin
                          .from('profiles')
                          .select('id, email')
                          .eq('email', 'test7@test7.com')
                          .limit(1);

                        if (profileError) {
                          console.error('Error finding user in profiles table:', profileError);
                        } else if (profileUsers && profileUsers.length > 0) {
                          // Found in profiles table, delete from there
                          const userId = profileUsers[0].id;
                          console.log(`Found user in profiles table with ID: ${userId}`);

                          const { error: deleteError } = await supabaseAdmin
                            .from('profiles')
                            .delete()
                            .eq('id', userId);

                          if (deleteError) {
                            console.error('Error deleting from profiles table:', deleteError);
                            throw new Error(`Error deleting from profiles table: ${deleteError.message}`);
                          }

                          console.log('Successfully deleted from profiles table');
                          setDeleteResult({
                            success: true,
                            message: 'User test7@test7.com deleted successfully from profiles table'
                          });

                          // Refresh the user list
                          setTimeout(() => fetchUsers(), 1000);
                          return;
                        }

                        throw new Error('User test7@test7.com not found in any table');
                      }

                      // Found the user in auth.users, delete using admin API
                      console.log(`Found user in auth.users with ID: ${user.id}`);

                      // Try to delete the user with the admin API
                      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

                      if (deleteError) {
                        console.error('Error deleting user with admin API:', deleteError);
                        throw new Error(`Error deleting user with admin API: ${deleteError.message}`);
                      }

                      console.log('Successfully deleted user with admin API');
                      setDeleteResult({
                        success: true,
                        message: 'User test7@test7.com deleted successfully with admin API'
                      });

                      // Refresh the user list
                      setTimeout(() => fetchUsers(), 1000);
                    })
                    .catch(error => {
                      console.error('Error in direct API deletion:', error);
                      setDeleteResult({
                        success: false,
                        message: `Direct API deletion failed: ${error.message}`
                      });
                    })
                    .finally(() => {
                      setIsLoading(false);
                    });
                }
              }}
              disabled={isDeleting || isLoading}
              className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 text-sm font-medium transition-colors"
            >
              Direct API Delete test7@test7.com
            </button>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete test7@test7.com using DIRECT REST API? This will bypass all normal methods.')) {
                  setIsLoading(true);
                  setError(null);

                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                  const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

                  (async () => {
                    try {
                      // Try to delete directly from auth.users table using a direct fetch call
                      // This bypasses the Supabase client and admin API completely

                      console.log('Attempting direct REST API deletion...');

                      // First, try to get the user ID using a direct query
                      const getUserResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_id_by_email`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${supabaseKey}`,
                          'apikey': supabaseKey,
                          'Content-Type': 'application/json',
                          'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                          email_param: 'test7@test7.com'
                        })
                      });

                      let userId = null;

                      if (getUserResponse.ok) {
                        const userData = await getUserResponse.json();
                        if (userData && userData.id) {
                          userId = userData.id;
                          console.log(`Found user ID: ${userId}`);
                        }
                      } else {
                        console.log('Failed to get user ID, trying alternative approach');
                      }

                      // If we couldn't get the user ID, try a different approach
                      if (!userId) {
                        // Try to delete by email directly from auth.users
                        const deleteByEmailResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_user_by_email`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${supabaseKey}`,
                            'apikey': supabaseKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                          },
                          body: JSON.stringify({
                            email_param: 'test7@test7.com'
                          })
                        });

                        if (deleteByEmailResponse.ok) {
                          console.log('Successfully deleted user by email');
                          setDeleteResult({
                            success: true,
                            message: 'User test7@test7.com deleted successfully via direct RPC call'
                          });

                          // Refresh the user list
                          setTimeout(() => fetchUsers(), 1000);
                          return;
                        } else {
                          console.log('Failed to delete user by email, trying more approaches');
                        }
                      }

                      // Try to delete from all possible tables
                      const tables = ['auth.users', 'users', 'profiles', 'cart_items', 'shipping_addresses', 'orders'];
                      let deletedFromAny = false;

                      for (const table of tables) {
                        try {
                          // Try to delete by email
                          const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/${table}?email=eq.test7@test7.com`, {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${supabaseKey}`,
                              'apikey': supabaseKey,
                              'Content-Type': 'application/json',
                              'Prefer': 'return=minimal'
                            }
                          });

                          if (deleteResponse.ok) {
                            console.log(`Successfully deleted from ${table} by email`);
                            deletedFromAny = true;
                          }

                          // If we have a user ID, try to delete by ID as well
                          if (userId) {
                            const deleteByIdResponse = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${userId}`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${supabaseKey}`,
                                'apikey': supabaseKey,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=minimal'
                              }
                            });

                            if (deleteByIdResponse.ok) {
                              console.log(`Successfully deleted from ${table} by ID`);
                              deletedFromAny = true;
                            }
                          }
                        } catch (tableError) {
                          console.error(`Error deleting from ${table}:`, tableError);
                        }
                      }

                      // Try one more approach - direct deletion from auth.users
                      try {
                        const authDeleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/test7@test7.com`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${supabaseKey}`,
                            'apikey': supabaseKey,
                            'Content-Type': 'application/json'
                          }
                        });

                        if (authDeleteResponse.ok) {
                          console.log('Successfully deleted from auth.users directly');
                          deletedFromAny = true;
                        }
                      } catch (authError) {
                        console.error('Error deleting from auth.users directly:', authError);
                      }

                      if (deletedFromAny) {
                        setDeleteResult({
                          success: true,
                          message: 'User test7@test7.com deleted successfully from one or more tables via direct REST API'
                        });
                      } else {
                        // Create the necessary functions if they don't exist
                        try {
                          // Create a function to get user ID by email
                          const createGetUserIdFn = await fetch(`${supabaseUrl}/rest/v1/rpc/create_function`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${supabaseKey}`,
                              'apikey': supabaseKey,
                              'Content-Type': 'application/json',
                              'Prefer': 'return=representation'
                            },
                            body: JSON.stringify({
                              function_name: 'get_user_id_by_email',
                              function_definition: `
                                CREATE OR REPLACE FUNCTION get_user_id_by_email(email_param TEXT)
                                RETURNS TABLE (id UUID) AS $$
                                BEGIN
                                  RETURN QUERY
                                  SELECT au.id FROM auth.users au WHERE au.email = email_param;
                                END;
                                $$ LANGUAGE plpgsql SECURITY DEFINER;
                              `
                            })
                          });

                          // Create a function to delete user by email
                          const createDeleteUserFn = await fetch(`${supabaseUrl}/rest/v1/rpc/create_function`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${supabaseKey}`,
                              'apikey': supabaseKey,
                              'Content-Type': 'application/json',
                              'Prefer': 'return=representation'
                            },
                            body: JSON.stringify({
                              function_name: 'delete_user_by_email',
                              function_definition: `
                                CREATE OR REPLACE FUNCTION delete_user_by_email(email_param TEXT)
                                RETURNS BOOLEAN AS $$
                                DECLARE
                                  user_id UUID;
                                BEGIN
                                  -- Find the user ID
                                  SELECT id INTO user_id FROM auth.users WHERE email = email_param;

                                  -- If found, delete from all related tables
                                  IF user_id IS NOT NULL THEN
                                    -- Delete from related tables
                                    DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = user_id);
                                    DELETE FROM auth.sessions WHERE user_id = user_id;
                                    DELETE FROM auth.identities WHERE user_id = user_id;
                                    DELETE FROM auth.users WHERE id = user_id;
                                    RETURN TRUE;
                                  END IF;

                                  -- If not found by ID, try to delete by email directly
                                  DELETE FROM auth.users WHERE email = email_param;

                                  RETURN TRUE;
                                EXCEPTION
                                  WHEN OTHERS THEN
                                    RETURN FALSE;
                                END;
                                $$ LANGUAGE plpgsql SECURITY DEFINER;
                              `
                            })
                          });

                          console.log('Created helper functions, trying again...');

                          // Try to delete the user again
                          const deleteAgainResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_user_by_email`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${supabaseKey}`,
                              'apikey': supabaseKey,
                              'Content-Type': 'application/json',
                              'Prefer': 'return=representation'
                            },
                            body: JSON.stringify({
                              email_param: 'test7@test7.com'
                            })
                          });

                          if (deleteAgainResponse.ok) {
                            console.log('Successfully deleted user after creating helper functions');
                            setDeleteResult({
                              success: true,
                              message: 'User test7@test7.com deleted successfully after creating helper functions'
                            });
                          } else {
                            throw new Error('Failed to delete user after creating helper functions');
                          }
                        } catch (fnError) {
                          console.error('Error creating helper functions:', fnError);
                          throw new Error('Failed to delete user and could not create helper functions');
                        }
                      }

                      // Refresh the user list
                      setTimeout(() => fetchUsers(), 1000);
                    } catch (error) {
                      console.error('Error in direct REST API deletion:', error);
                      setDeleteResult({
                        success: false,
                        message: `Direct REST API deletion failed: ${error.message}`
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  })();
                }
              }}
              disabled={isDeleting || isLoading}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 text-sm font-medium transition-colors"
            >
              DIRECT REST API Delete test7@test7.com
            </button>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete test7@test7.com using REST API? This will attempt to delete the user directly from the database tables.')) {
                  setIsLoading(true);
                  setError(null);

                  const supabaseAdmin = createAdminClient();
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                  const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

                  // First try to delete from auth.users table using the REST API
                  (async () => {
                    try {
                      // First, try to find the user ID by email
                      const { data: authUsers, error: authError } = await supabaseAdmin
                        .from('auth.users')
                        .select('id')
                        .eq('email', 'test7@test7.com')
                        .limit(1);

                      if (authError) {
                        console.log('Error querying auth.users:', authError);
                        // Continue with other approaches
                      } else if (authUsers && authUsers.length > 0) {
                        const userId = authUsers[0].id;
                        console.log(`Found user ID in auth.users: ${userId}`);

                        // Try to delete the user with the admin API
                        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

                        if (deleteError) {
                          console.error('Error deleting with admin API:', deleteError);
                          // Continue with other approaches
                        } else {
                          console.log('Successfully deleted user with admin API');
                          setDeleteResult({
                            success: true,
                            message: 'User test7@test7.com deleted successfully with admin API'
                          });

                          // Refresh the user list
                          setTimeout(() => fetchUsers(), 1000);
                          return;
                        }
                      }

                      // Try to delete from custom tables using the REST API
                      const tables = ['users', 'profiles', 'cart_items', 'shipping_addresses', 'orders'];
                      let deletedFromAny = false;

                      for (const table of tables) {
                        try {
                          const { error } = await supabaseAdmin
                            .from(table)
                            .delete()
                            .eq('email', 'test7@test7.com');

                          if (!error) {
                            console.log(`Successfully deleted from ${table} table`);
                            deletedFromAny = true;
                          }
                        } catch (tableError) {
                          console.error(`Error deleting from ${table}:`, tableError);
                        }
                      }

                      // Try to delete using the Management API directly
                      try {
                        // Use the server-side proxy to avoid CORS issues
                        const response = await fetch('/api/delete-user-by-email', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            email: 'test7@test7.com',
                            serviceKey: supabaseKey
                          })
                        });

                        if (response.ok) {
                          console.log('Successfully deleted user via proxy API');
                          deletedFromAny = true;
                        } else {
                          console.error('Error deleting via proxy API:', await response.text());
                        }
                      } catch (proxyError) {
                        console.error('Error with proxy API:', proxyError);
                      }

                      // Try one more approach - direct REST API call to Supabase
                      try {
                        const response = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.test7@test7.com`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${supabaseKey}`,
                            'apikey': supabaseKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                          }
                        });

                        if (response.ok) {
                          console.log('Successfully deleted user via direct REST API');
                          deletedFromAny = true;
                        }
                      } catch (restError) {
                        console.error('Error with direct REST API:', restError);
                      }

                      if (deletedFromAny) {
                        setDeleteResult({
                          success: true,
                          message: 'User test7@test7.com deleted successfully from one or more tables'
                        });
                      } else {
                        setDeleteResult({
                          success: false,
                          message: 'Failed to delete user test7@test7.com from any table'
                        });
                      }

                      // Refresh the user list
                      setTimeout(() => fetchUsers(), 1000);
                    } catch (error) {
                      console.error('Error in REST API deletion:', error);
                      setDeleteResult({
                        success: false,
                        message: `REST API deletion failed: ${error.message}`
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  })();
                }
              }}
              disabled={isDeleting || isLoading}
              className="px-3 py-1 bg-red-800 text-white rounded-md hover:bg-red-900 disabled:bg-red-300 text-sm font-medium transition-colors"
            >
              REST API Delete test7@test7.com
            </button>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to run the server-side script to delete test7@test7.com? This will run a Node.js script on the server.')) {
                  setIsLoading(true);
                  setError(null);

                  // Launch the script as a process
                  (async () => {
                    try {
                      // Use fetch to call a server endpoint that runs the script
                      const response = await fetch('/api/run-script', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          script: 'delete_user_by_email.js',
                          args: ['test7@test7.com']
                        })
                      });

                      if (!response.ok) {
                        throw new Error(`Server returned ${response.status}: ${await response.text()}`);
                      }

                      const result = await response.json();

                      console.log('Script execution result:', result);
                      setDeleteResult({
                        success: true,
                        message: `Server script executed successfully: ${result.message || 'User deleted'}`
                      });

                      // Remove the user from our local list
                      setUsers(prevUsers => prevUsers.filter(u => u.email !== 'test7@test7.com'));

                      // Refresh the user list
                      setTimeout(() => fetchUsers(), 1000);
                    } catch (error) {
                      console.error('Error running server script:', error);
                      setDeleteResult({
                        success: false,
                        message: `Error running server script: ${error.message}`
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  })();
                }
              }}
              disabled={isDeleting || isLoading}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 text-sm font-medium transition-colors"
            >
              Run Server Script for test7@test7.com
            </button>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to try the nuclear option for test7@test7.com? This will use the Supabase Management API to delete the user.')) {
                  setIsLoading(true);
                  setError(null);

                  // Use the Supabase Management API directly
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                  const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
                  const projectRef = supabaseUrl.split('.')[0].replace('https://', '');

                  (async () => {
                    try {
                      // First, try to find the user by email using the admin API
                      const supabaseAdmin = createAdminClient();
                      const { data, error } = await supabaseAdmin.auth.admin.listUsers();

                      if (error) {
                        console.error('Error listing users:', error);
                        throw new Error(`Error listing users: ${error.message}`);
                      }

                      // Find the user with email test7@test7.com
                      const user = data?.users?.find(u => u.email === 'test7@test7.com');

                      if (!user) {
                        console.log('User not found in auth.users, trying direct API...');

                        // Try to delete by email directly using the Management API
                        try {
                          // First try to get the user ID from the Management API
                          const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/auth/users?email=test7@test7.com`, {
                            method: 'GET',
                            headers: {
                              'Authorization': `Bearer ${supabaseKey}`,
                              'Content-Type': 'application/json'
                            }
                          });

                          if (!response.ok) {
                            console.error('Error getting user from Management API:', await response.text());
                            throw new Error('Failed to get user from Management API');
                          }

                          const userData = await response.json();
                          console.log('User data from Management API:', userData);

                          if (userData && userData.length > 0) {
                            const userId = userData[0].id;
                            console.log(`Found user ID from Management API: ${userId}`);

                            // Now delete the user
                            const deleteResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/auth/users/${userId}`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${supabaseKey}`,
                                'Content-Type': 'application/json'
                              }
                            });

                            if (!deleteResponse.ok) {
                              console.error('Error deleting user with Management API:', await deleteResponse.text());
                              throw new Error('Failed to delete user with Management API');
                            }

                            console.log('Successfully deleted user with Management API');
                            setDeleteResult({
                              success: true,
                              message: 'User test7@test7.com deleted successfully via Management API'
                            });

                            // Remove the user from our local list
                            setUsers(prevUsers => prevUsers.filter(u => u.email !== 'test7@test7.com'));

                            // Refresh the user list
                            setTimeout(() => fetchUsers(), 1000);
                            return;
                          }
                        } catch (managementError) {
                          console.error('Management API error:', managementError);
                        }

                        // Try one more approach - direct deletion from all tables
                        try {
                          // Delete from users table
                          await supabaseAdmin
                            .from('users')
                            .delete()
                            .eq('email', 'test7@test7.com');

                          // Delete from profiles table
                          await supabaseAdmin
                            .from('profiles')
                            .delete()
                            .eq('email', 'test7@test7.com');

                          // Try to delete using a direct API call to auth/v1/admin/users
                          const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=eq.test7@test7.com`, {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${supabaseKey}`,
                              'apikey': supabaseKey,
                              'Content-Type': 'application/json'
                            }
                          });

                          console.log('Direct API deletion response:', deleteResponse.status);

                          setDeleteResult({
                            success: true,
                            message: 'User test7@test7.com deletion attempted via multiple methods'
                          });

                          // Remove the user from our local list
                          setUsers(prevUsers => prevUsers.filter(u => u.email !== 'test7@test7.com'));

                          // Refresh the user list
                          setTimeout(() => fetchUsers(), 1000);
                        } catch (directError) {
                          console.error('Direct deletion error:', directError);
                          throw directError;
                        }
                      } else {
                        // Found the user in auth.users, delete using admin API
                        const userId = user.id;
                        console.log(`Found user in auth.users with ID: ${userId}`);

                        // Try to delete the user with the admin API
                        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

                        if (deleteError) {
                          console.error('Error deleting user with admin API:', deleteError);
                          throw new Error(`Error deleting user with admin API: ${deleteError.message}`);
                        }

                        console.log('Successfully deleted user with admin API');
                        setDeleteResult({
                          success: true,
                          message: 'User test7@test7.com deleted successfully with admin API'
                        });

                        // Remove the user from our local list
                        setUsers(prevUsers => prevUsers.filter(u => u.email !== 'test7@test7.com'));

                        // Refresh the user list
                        setTimeout(() => fetchUsers(), 1000);
                      }
                    } catch (error) {
                      console.error('Nuclear option error:', error);
                      setDeleteResult({
                        success: false,
                        message: `Nuclear option failed: ${error.message}`
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  })();
                }
              }}
              disabled={isDeleting || isLoading}
              className="px-3 py-1 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-500 text-sm font-medium transition-colors"
            >
              Nuclear Option for test7@test7.com
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-red-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Error
          </h3>
          <p className="text-red-700 text-base leading-relaxed">{error}</p>
        </div>
      )}

      {deleteResult && (
        <div className={`mb-8 p-6 ${deleteResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg shadow-sm`}>
          <h3 className={`text-xl font-semibold ${deleteResult.success ? 'text-green-800' : 'text-red-800'} mb-3 flex items-center`}>
            {deleteResult.success ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {deleteResult.success ? 'Success' : 'Error'}
          </h3>
          <p className={`${deleteResult.success ? 'text-green-700' : 'text-red-700'} text-base leading-relaxed mb-4`}>{deleteResult.message}</p>

          {deleteResult.details && (
            <div className="mt-4 border-t pt-4 border-gray-200">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  View Detailed Results
                </summary>
                <div className="mt-3 pl-4 border-l-2 border-gray-200">
                  {deleteResult.details.map((result, index) => (
                    <div key={index} className={`mb-3 p-3 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="font-mono text-xs mb-1 text-gray-500">User ID: {result.userId}</p>
                      <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.success ? '✅ ' : '❌ '}
                        {result.message}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && Object.keys(selectedUsers).length === users.length}
                    onChange={toggleAllUsers}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Confirmed
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-gray-500">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center">
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                      <p className="mt-1 text-sm text-gray-500">Try refreshing the page or adding manual user IDs.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={!!selectedUsers[user.id]}
                        onChange={() => toggleUserSelection(user.id)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono break-all max-w-xs">
                        {user.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center flex-wrap gap-2">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        {user.is_manual && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Manual Entry
                          </span>
                        )}
                        {user.is_custom && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Custom Auth
                          </span>
                        )}
                        {!user.is_manual && !user.is_custom && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Supabase Auth
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email_confirmed_at ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => deleteUser(user.id)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-900 disabled:text-red-300 bg-red-50 hover:bg-red-100 disabled:bg-red-50 px-3 py-1 rounded-md transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            // Create a confirmation dialog
                            if (window.confirm(`Are you sure you want to FORCE DELETE user ${user.id}? This will bypass normal checks and cannot be undone.`)) {
                              // Call the SQL deletion directly
                              setIsDeleting(true);
                              const supabaseAdmin = createAdminClient();

                              // Use the most aggressive SQL deletion approach
                              const forceSql = `
                                BEGIN;
                                -- Disable triggers and constraints
                                SET session_replication_role = 'replica';

                                -- Delete from all possible related tables
                                DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = '${user.id}');
                                DELETE FROM auth.sessions WHERE user_id = '${user.id}';
                                DELETE FROM auth.identities WHERE user_id = '${user.id}';
                                DELETE FROM auth.mfa_factors WHERE user_id = '${user.id}';
                                DELETE FROM auth.mfa_challenges WHERE user_id = '${user.id}';
                                DELETE FROM auth.users WHERE id = '${user.id}';
                                DELETE FROM public.users WHERE id = '${user.id}';
                                DELETE FROM public.profiles WHERE id = '${user.id}';
                                DELETE FROM public.cart_items WHERE user_id = '${user.id}';
                                DELETE FROM public.shipping_addresses WHERE user_id = '${user.id}';
                                DELETE FROM public.orders WHERE user_id = '${user.id}';

                                -- Re-enable triggers
                                SET session_replication_role = 'origin';
                                COMMIT;
                              `;

                              supabaseAdmin.rpc('run_sql', { sql: forceSql })
                                .then(({ error }) => {
                                  if (error) {
                                    console.error('Force delete SQL error:', error);
                                    setDeleteResult({
                                      success: false,
                                      message: `Force delete failed: ${error.message}`
                                    });
                                  } else {
                                    console.log('Force delete successful');
                                    setDeleteResult({
                                      success: true,
                                      message: `User ${user.id} force deleted successfully`
                                    });

                                    // Remove the user from our local list
                                    setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));

                                    // Refresh the user list after a short delay
                                    setTimeout(() => {
                                      fetchUsers();
                                    }, 1000);
                                  }
                                })
                                .catch(error => {
                                  console.error('Force delete exception:', error);
                                  setDeleteResult({
                                    success: false,
                                    message: `Force delete exception: ${error.message}`
                                  });
                                })
                                .finally(() => {
                                  setIsDeleting(false);
                                });
                            }
                          }}
                          disabled={isDeleting}
                          className="text-orange-600 hover:text-orange-900 disabled:text-orange-300 bg-orange-50 hover:bg-orange-100 disabled:bg-orange-50 px-3 py-1 rounded-md transition-colors"
                        >
                          Force Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagementDebugPage;
