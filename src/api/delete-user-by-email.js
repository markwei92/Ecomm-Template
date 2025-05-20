// This file serves as a proxy for deleting users from Supabase by email
// It should be deployed as a serverless function or API route

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, serviceKey } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!serviceKey) {
      return res.status(400).json({ error: 'Service key is required' });
    }

    // Get the Supabase URL from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || req.headers['x-supabase-url'];
    
    if (!supabaseUrl) {
      return res.status(400).json({ error: 'Supabase URL is required' });
    }

    // First try to get the user ID by email
    const getUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      }
    });

    if (!getUserResponse.ok) {
      return res.status(getUserResponse.status).json({ 
        success: false, 
        message: `Failed to get user by email: ${await getUserResponse.text()}` 
      });
    }

    const userData = await getUserResponse.json();
    
    if (!userData || !userData.users || userData.users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `User with email ${email} not found` 
      });
    }

    const userId = userData.users[0].id;
    console.log(`Found user with ID: ${userId}`);

    // Now delete the user
    const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      }
    });

    if (!deleteResponse.ok) {
      return res.status(deleteResponse.status).json({ 
        success: false, 
        message: `Failed to delete user: ${await deleteResponse.text()}` 
      });
    }

    // Also try to delete from custom tables
    try {
      // Delete from users table
      await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      });

      // Delete from profiles table
      await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      });
    } catch (customError) {
      console.error('Error deleting from custom tables:', customError);
      // Continue anyway
    }

    return res.status(200).json({ 
      success: true, 
      message: `User with email ${email} deleted successfully`,
      userId
    });
  } catch (error) {
    console.error('Error in delete-user-by-email API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
}
