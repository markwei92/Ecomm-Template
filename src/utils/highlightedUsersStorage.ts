/**
 * Utility functions for managing highlighted users in localStorage
 */

const STORAGE_KEY = 'highlighted_users';

/**
 * Get all highlighted user IDs from localStorage
 */
export const getHighlightedUsers = (): string[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];

    const parsedData = JSON.parse(storedData);
    if (!Array.isArray(parsedData)) return [];

    return parsedData;
  } catch (error) {
    console.error('Error getting highlighted users from localStorage:', error);
    return [];
  }
};

/**
 * Add a user to the highlighted users list
 */
export const addHighlightedUser = (userId: string): void => {
  try {
    const currentUsers = getHighlightedUsers();

    // Don't add if already in the list
    if (currentUsers.includes(userId)) return;

    const updatedUsers = [...currentUsers, userId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));

    console.log(`Added user ${userId} to highlighted users. New count: ${updatedUsers.length}`);
  } catch (error) {
    console.error('Error adding highlighted user to localStorage:', error);
  }
};

/**
 * Remove a user from the highlighted users list
 */
export const removeHighlightedUser = (userId: string): void => {
  try {
    const currentUsers = getHighlightedUsers();

    // Don't remove if not in the list
    if (!currentUsers.includes(userId)) return;

    const updatedUsers = currentUsers.filter(id => id !== userId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));

    console.log(`Removed user ${userId} from highlighted users. New count: ${updatedUsers.length}`);
  } catch (error) {
    console.error('Error removing highlighted user from localStorage:', error);
  }
};

/**
 * Toggle a user's highlighted state
 */
export const toggleHighlightedUser = (userId: string, highlighted: boolean): void => {
  if (highlighted) {
    addHighlightedUser(userId);
  } else {
    removeHighlightedUser(userId);
  }
};

/**
 * Check if a user is highlighted
 */
export const isUserHighlighted = (userId: string): boolean => {
  const highlightedUsers = getHighlightedUsers();
  return highlightedUsers.includes(userId);
};

/**
 * Get the count of highlighted users
 */
export const getHighlightedUsersCount = (): number => {
  return getHighlightedUsers().length;
};

/**
 * Clear all highlighted users
 */
export const clearHighlightedUsers = (): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  console.log('Cleared all highlighted users');
};

/**
 * Set all users as highlighted
 * @param userIds Array of user IDs to highlight
 */
export const setAllUsersHighlighted = (userIds: string[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userIds));
  console.log(`Set ${userIds.length} users as highlighted`);
};
