// Run this script in the browser console to force notification badges to appear

// Force notification badge to appear
function forceNotificationBadge() {
  console.log('Forcing notification badge to appear...');
  
  // Set notification counts in localStorage
  const notificationCounts = {
    orders: 0,
    inquiries: 0,
    users: 4  // Set to 4 to match the number of users in the screenshot
  };
  
  localStorage.setItem('admin_notification_counts', JSON.stringify(notificationCounts));
  console.log('Set notification counts in localStorage:', notificationCounts);
  
  // Reload the page
  window.location.reload();
}

// Execute the function
forceNotificationBadge();
