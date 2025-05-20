import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getHighlightedUsersCount, getHighlightedUsers } from '../utils/highlightedUsersStorage';

interface NotificationCounts {
  orders: number;
  inquiries: number;
  users: number;
  mailingList: number;
  reviews: number;
}

interface AdminNotificationsContextType {
  notificationCounts: NotificationCounts;
  fetchNotificationCounts: () => Promise<void>;
  markOrdersAsViewed: () => Promise<void>;
  markInquiriesAsViewed: () => Promise<void>;
  markUsersAsViewed: () => Promise<void>;
  markMailingListAsViewed: () => Promise<void>;
  markReviewsAsViewed: () => Promise<void>;
  markOrderAsViewed: (orderId: string) => Promise<void>;
  markInquiryAsViewed: (inquiryId: string) => Promise<void>;
  markUserAsViewed: (userId: string) => Promise<void>;
  markMailingListItemAsViewed: (id: string) => Promise<void>;
  markReviewAsViewed: (reviewId: string) => Promise<void>;
  toggleUserHighlighted: (userId: string, highlighted: boolean) => Promise<void>;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextType | undefined>(undefined);

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationsContext);
  if (context === undefined) {
    throw new Error('useAdminNotifications must be used within an AdminNotificationsProvider');
  }
  return context;
};

interface AdminNotificationsProviderProps {
  children: ReactNode;
}

export const AdminNotificationsProvider: React.FC<AdminNotificationsProviderProps> = ({ children }) => {
  // Check if we should force notifications
  const shouldForceNotifications = new URLSearchParams(window.location.search).get('force_notifications') === 'true';

  // Check if we have stored notification counts in localStorage
  const storedCounts = localStorage.getItem('admin_notification_counts');
  const parsedCounts = storedCounts ? JSON.parse(storedCounts) : null;

  // Initialize with stored counts or defaults
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>(() => {
    // Get the highlighted users count from localStorage
    const highlightedUsersCount = getHighlightedUsersCount();
    console.log(`Initializing users notification count from localStorage: ${highlightedUsersCount}`);

    // Use stored counts or defaults, but always use the highlighted users count from localStorage
    return parsedCounts ? {
      ...parsedCounts,
      users: highlightedUsersCount,
      mailingList: parsedCounts.mailingList || 0,
      reviews: parsedCounts.reviews || 0
    } : {
      orders: 0,
      inquiries: 0,
      users: highlightedUsersCount,
      mailingList: 0,
      reviews: 0
    };
  });

  // Log initial state
  console.log('AdminNotificationsProvider initialized with:', {
    shouldForceNotifications,
    storedCounts,
    notificationCounts
  });

  // Fetch notification counts from the database
  const fetchNotificationCounts = async (): Promise<void> => {
    try {
      console.log('Fetching notification counts...');

      let ordersCount = 0;
      let inquiriesCount = 0;
      let usersCount = 0;
      let mailingListCount = 0;
      let reviewsCount = 0;

      // Skip checking if columns exist - this was causing errors
      console.log('Skipping column existence checks due to RPC function issues');

      // Fetch unviewed orders count
      try {
        const { count, error } = await supabase
          .from('stripe_orders')
          .select('id', { count: 'exact', head: true })
          .eq('viewed', false);

        if (error) {
          console.error('Error fetching orders count:', error);
        } else {
          console.log('Unviewed orders count:', count);
          ordersCount = count || 0;
        }
      } catch (error) {
        console.error('Error fetching orders count:', error);
      }

      // Fetch unviewed inquiries count
      try {
        const { count, error } = await supabase
          .from('inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('viewed', false);

        if (error) {
          console.error('Error fetching inquiries count:', error);
        } else {
          console.log('Unviewed inquiries count:', count);
          inquiriesCount = count || 0;
        }
      } catch (error) {
        console.error('Error fetching inquiries count:', error);
      }

      // Skip cleaning up invalid notifications - this was causing errors
      console.log('Skipping cleanup of invalid notifications due to RPC function issues');

      // Get highlighted users count from localStorage instead of database
      usersCount = getHighlightedUsersCount();
      console.log('Highlighted users count from localStorage:', usersCount);

      // For debugging, also fetch the database state
      try {
        const { count: dbUsersCount, error } = await supabase
          .from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('highlighted', true);

        if (error) {
          console.error('Error fetching highlighted user count from database:', error);
        } else {
          console.log('Highlighted user notifications count from database:', dbUsersCount);
          console.log('Difference between localStorage and database:', usersCount - (dbUsersCount || 0));
        }
      } catch (error) {
        console.error('Error fetching highlighted user count from database:', error);
      }

      // If we have no notifications but we know there are new users, create notifications for them
      if (usersCount === 0) {
        console.log('No notifications found, checking for new users...');

        // Skip user notification creation due to database function issues
        console.log('Skipping user notification creation due to database function issues');
      }

      // Fetch unviewed mailing list subscribers count
      try {
        const { count, error } = await supabase
          .from('mailing_list')
          .select('id', { count: 'exact', head: true })
          .eq('viewed', false);

        if (error) {
          console.error('Error fetching mailing list count:', error);
        } else {
          console.log('Unviewed mailing list subscribers count:', count);
          mailingListCount = count || 0;
        }
      } catch (error) {
        console.error('Error fetching mailing list count:', error);
      }

      // Fetch unviewed reviews count
      try {
        const { count, error } = await supabase
          .from('product_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('viewed', false)
          .is('deleted_at', null);

        if (error) {
          console.error('Error fetching reviews count:', error);
        } else {
          console.log('Unviewed reviews count:', count);
          reviewsCount = count || 0;
        }
      } catch (error) {
        console.error('Error fetching reviews count:', error);
      }

      // Use the actual count of unviewed notifications
      const displayUsersCount = usersCount || 0;

      // Log the highlighted users from localStorage
      const highlightedUsers = getHighlightedUsers();
      if (highlightedUsers.length > 0) {
        console.log('Highlighted users from localStorage:', highlightedUsers);
        console.log(`Highlighted users count: ${displayUsersCount}`);
      } else {
        console.log('No highlighted users found in localStorage');
      }

      // Force a refresh of user notifications if count is 0
      if (displayUsersCount === 0) {
        console.log('No highlighted user notifications found, forcing a refresh...');

        // Skip calling the RPC function due to database issues
        console.log('Skipping create_notifications_for_latest_users due to database function issues');
      }

      // Create the final notification counts object
      const newCounts = {
        orders: ordersCount,
        inquiries: inquiriesCount,
        users: displayUsersCount,
        mailingList: mailingListCount,
        reviews: reviewsCount
      };

      // Log the highlighted users for debugging
      console.log('Highlighted user IDs from localStorage:', getHighlightedUsers());
      console.log('Setting notification counts:', newCounts);

      // Store the counts in localStorage
      localStorage.setItem('admin_notification_counts', JSON.stringify(newCounts));

      // Update the state
      setNotificationCounts(newCounts);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  // Mark all orders as viewed
  const markOrdersAsViewed = async () => {
    try {
      const { error } = await supabase
        .from('stripe_orders')
        .update({ viewed: true })
        .eq('viewed', false);

      if (error) throw error;

      setNotificationCounts(prev => ({ ...prev, orders: 0 }));
    } catch (error) {
      console.error('Error marking orders as viewed:', error);
    }
  };

  // Mark a single order as viewed
  const markOrderAsViewed = async (orderId: string) => {
    try {
      // Only update the viewed status in the database, don't trigger a full refresh
      const { error } = await supabase
        .from('stripe_orders')
        .update({ viewed: true })
        .eq('id', orderId);

      if (error) throw error;

      // Decrement the notification count if it's greater than 0
      setNotificationCounts(prev => ({
        ...prev,
        orders: Math.max(0, prev.orders - 1)
      }));

      console.log(`Order ${orderId} marked as viewed`);
    } catch (error) {
      console.error('Error marking order as viewed:', error);
    }
  };

  // Mark all inquiries as viewed
  const markInquiriesAsViewed = async () => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .update({ viewed: true })
        .eq('viewed', false);

      if (error) throw error;

      setNotificationCounts(prev => ({ ...prev, inquiries: 0 }));
    } catch (error) {
      console.error('Error marking inquiries as viewed:', error);
    }
  };

  // Mark a single inquiry as viewed
  const markInquiryAsViewed = async (inquiryId: string) => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .update({ viewed: true })
        .eq('id', inquiryId);

      if (error) throw error;

      // Decrement the notification count if it's greater than 0
      setNotificationCounts(prev => ({
        ...prev,
        inquiries: Math.max(0, prev.inquiries - 1)
      }));
    } catch (error) {
      console.error('Error marking inquiry as viewed:', error);
    }
  };

  // Mark all user notifications as viewed and unhighlighted
  const markUsersAsViewed = async () => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ viewed: true, highlighted: false })
        .eq('highlighted', true);

      if (error) throw error;

      setNotificationCounts(prev => ({ ...prev, users: 0 }));
    } catch (error) {
      console.error('Error marking user notifications as viewed:', error);
    }
  };

  // Mark a single user notification as viewed and unhighlighted
  const markUserAsViewed = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ viewed: true, highlighted: false })
        .eq('user_id', userId);

      if (error) throw error;

      // Decrement the notification count if it's greater than 0
      setNotificationCounts(prev => ({
        ...prev,
        users: Math.max(0, prev.users - 1)
      }));
    } catch (error) {
      console.error('Error marking user notification as viewed:', error);
    }
  };

  // Toggle the highlighted state of a user notification
  const toggleUserHighlighted = async (userId: string, highlighted: boolean) => {
    try {
      console.log(`Toggling highlighted state for user ${userId} to ${highlighted}`);

      // First check if a notification exists for this user
      const { data: existingNotification, error: checkError } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing notification:', checkError);
        return;
      }

      let updateError = null;

      if (existingNotification) {
        // Update existing notification
        console.log(`Updating existing notification for user ${userId}`);
        const { error } = await supabase
          .from('user_notifications')
          .update({ highlighted })
          .eq('user_id', userId);

        updateError = error;
      } else {
        // Create new notification
        console.log(`Creating new notification for user ${userId}`);
        const { error } = await supabase
          .from('user_notifications')
          .insert({
            user_id: userId,
            viewed: false,
            highlighted
          });

        updateError = error;
      }

      if (updateError) {
        console.error('Error updating highlighted state:', updateError);
        return;
      }

      // Update notification counts based on highlighted state
      if (highlighted) {
        // If highlighting, increment the count
        console.log(`Incrementing notification count for users`);
        setNotificationCounts(prev => {
          const newCount = prev.users + 1;
          console.log(`User notifications: ${prev.users} -> ${newCount}`);
          return { ...prev, users: newCount };
        });
      } else {
        // If unhighlighting, decrement the count
        console.log(`Decrementing notification count for users`);
        setNotificationCounts(prev => {
          const newCount = Math.max(0, prev.users - 1);
          console.log(`User notifications: ${prev.users} -> ${newCount}`);
          return { ...prev, users: newCount };
        });
      }

      console.log(`Successfully toggled highlighted state for user ${userId} to ${highlighted}`);

      // Force a refresh of notification counts after a short delay
      setTimeout(() => {
        console.log('Refreshing notification counts after toggle');
        fetchNotificationCounts();
      }, 500);
    } catch (error) {
      console.error('Error toggling user highlighted state:', error);
    }
  };

  // Mark all mailing list subscribers as viewed
  const markMailingListAsViewed = async () => {
    try {
      // Use direct update instead of RPC function
      const { error } = await supabase
        .from('mailing_list')
        .update({ viewed: true })
        .eq('viewed', false);

      if (error) throw error;

      setNotificationCounts(prev => ({ ...prev, mailingList: 0 }));
    } catch (error) {
      console.error('Error marking mailing list as viewed:', error);
    }
  };

  // Mark a single mailing list subscriber as viewed
  const markMailingListItemAsViewed = async (id: string) => {
    try {
      const { error } = await supabase
        .from('mailing_list')
        .update({ viewed: true })
        .eq('id', id);

      if (error) throw error;

      // Decrement the notification count if it's greater than 0
      setNotificationCounts(prev => ({
        ...prev,
        mailingList: Math.max(0, prev.mailingList - 1)
      }));
    } catch (error) {
      console.error('Error marking mailing list item as viewed:', error);
    }
  };

  // Mark all reviews as viewed
  const markReviewsAsViewed = async () => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ viewed: true })
        .eq('viewed', false)
        .is('deleted_at', null);

      if (error) throw error;

      setNotificationCounts(prev => ({ ...prev, reviews: 0 }));
    } catch (error) {
      console.error('Error marking reviews as viewed:', error);
    }
  };

  // Mark a single review as viewed
  const markReviewAsViewed = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ viewed: true })
        .eq('id', reviewId);

      if (error) throw error;

      // Decrement the notification count if it's greater than 0
      setNotificationCounts(prev => ({
        ...prev,
        reviews: Math.max(0, prev.reviews - 1)
      }));
    } catch (error) {
      console.error('Error marking review as viewed:', error);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    console.log('AdminNotificationsContext mounted');

    // Initial fetch of notification counts
    fetchNotificationCounts();

    // Set up a polling interval to refresh notification counts every 10 seconds
    // Using a longer interval to prevent interference with user interactions
    const pollingInterval = setInterval(() => {
      console.log('Polling for notification counts...');
      fetchNotificationCounts();
    }, 10000);

    // Clean up subscriptions and polling interval
    return () => {
      console.log('AdminNotificationsContext unmounting, cleaning up subscriptions');
      clearInterval(pollingInterval);
    };
  }, []);

  // Debug: Log notification counts whenever they change
  useEffect(() => {
    console.log('Notification counts updated:', notificationCounts);
  }, [notificationCounts]);

  return (
    <AdminNotificationsContext.Provider
      value={{
        notificationCounts,
        fetchNotificationCounts,
        markOrdersAsViewed,
        markInquiriesAsViewed,
        markUsersAsViewed,
        markMailingListAsViewed,
        markReviewsAsViewed,
        markOrderAsViewed,
        markInquiryAsViewed,
        markUserAsViewed,
        markMailingListItemAsViewed,
        markReviewAsViewed,
        toggleUserHighlighted
      }}
    >
      {children}
    </AdminNotificationsContext.Provider>
  );
};