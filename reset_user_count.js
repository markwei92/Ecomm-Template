// Run this script in the browser console to reset the notification state

// Reset notification state
function resetNotificationState() {
  console.log('Resetting notification state...');

  // Clear the user count state (legacy)
  localStorage.removeItem('user_count_state');

  // Clear notification counts
  localStorage.removeItem('admin_notification_counts');

  // Note: The highlighted state is now stored in Supabase
  // This script only clears the local cache
  console.log('Local notification state cleared');
  console.log('Note: To reset highlighted state in the database, run the SQL script: add_highlighted_column.sql');
  console.log('Reloading page...');

  // Reload the page
  window.location.reload();
}

// Execute the function
resetNotificationState();
