// This file serves as a proxy for deleting users from Supabase
// It should be deployed as a serverless function or API route

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, serviceKey } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!serviceKey) {
      return res.status(400).json({ error: 'Service key is required' });
    }

    // Get the Supabase URL from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || req.headers['x-supabase-url'];
    
    if (!supabaseUrl) {
      return res.status(400).json({ error: 'Supabase URL is required' });
    }

    // Try multiple endpoints to delete the user
    const endpoints = [
      `${supabaseUrl}/auth/v1/admin/users/${userId}`,
      `${supabaseUrl}/rest/v1/users?id=eq.${userId}`
    ];

    let success = false;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to delete user with endpoint: ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'apikey': serviceKey
          }
        });

        if (response.ok) {
          console.log(`Successfully deleted user with endpoint: ${endpoint}`);
          success = true;
          break;
        }

        const errorData = await response.json().catch(() => ({}));
        console.error(`API error with endpoint ${endpoint}:`, errorData);
        lastError = `API returned ${response.status}: ${errorData.message || 'Unknown error'}`;
      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error);
        lastError = error.message;
      }
    }

    if (success) {
      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete user', 
        error: lastError 
      });
    }
  } catch (error) {
    console.error('Error in delete-user API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
}
