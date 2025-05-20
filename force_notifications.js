// This script forces the notification system to recognize unviewed notifications
// Run this in the browser console when on the admin dashboard

// Function to force notification refresh
async function forceNotificationRefresh() {
  console.log('Forcing notification refresh...');
  
  try {
    // Get the AdminNotificationsContext from React DevTools
    // This is a hack to directly access the React context
    const adminNotificationsContext = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?._currentDispatcher?.current?.useContext?.(window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?._currentDispatcher?.current?.useDebugValue?.('AdminNotificationsContext'));
    
    if (adminNotificationsContext) {
      console.log('Found AdminNotificationsContext:', adminNotificationsContext);
      
      // Call fetchNotificationCounts
      if (typeof adminNotificationsContext.fetchNotificationCounts === 'function') {
        await adminNotificationsContext.fetchNotificationCounts();
        console.log('Fetched notification counts');
      } else {
        console.error('fetchNotificationCounts is not a function');
      }
    } else {
      console.error('Could not find AdminNotificationsContext');
    }
  } catch (error) {
    console.error('Error forcing notification refresh:', error);
  }
}

// Alternative approach: directly set notification counts
function setNotificationCounts(users = 10) {
  console.log(`Setting user notifications count to ${users}...`);
  
  try {
    // Find the AdminNotificationsProvider component in the React tree
    const root = document.querySelector('#root');
    if (!root || !root._reactRootContainer) {
      console.error('React root not found');
      return;
    }
    
    // This is a simpler approach that doesn't rely on React DevTools
    // Just manually update the notification counts in localStorage
    localStorage.setItem('admin_notification_counts', JSON.stringify({
      orders: 0,
      inquiries: 0,
      users: users
    }));
    
    console.log('Set notification counts in localStorage');
    console.log('Please refresh the page to see the changes');
  } catch (error) {
    console.error('Error setting notification counts:', error);
  }
}

// Simplest approach: just reload the page with a special query parameter
function reloadWithNotifications() {
  console.log('Reloading page with notifications...');
  
  // Add a query parameter to force notifications
  const url = new URL(window.location.href);
  url.searchParams.set('force_notifications', 'true');
  
  // Reload the page
  window.location.href = url.toString();
}

// Execute the functions
console.log('Starting notification fix...');
setNotificationCounts(10);
// Uncomment the line below if you want to reload the page
// reloadWithNotifications();
