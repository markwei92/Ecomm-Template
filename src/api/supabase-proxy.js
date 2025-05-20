// This file serves as a proxy for Supabase API requests
// It helps avoid CORS issues by proxying requests through the server

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, method, headers, body } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Get the Supabase URL from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || req.headers['x-supabase-url'];
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || req.body.serviceKey;
    
    if (!supabaseUrl) {
      return res.status(400).json({ error: 'Supabase URL is required' });
    }

    if (!supabaseKey) {
      return res.status(400).json({ error: 'Supabase key is required' });
    }

    // Construct the full URL
    const url = endpoint.startsWith('http') ? endpoint : `${supabaseUrl}${endpoint}`;

    // Prepare headers
    const requestHeaders = {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      ...headers
    };

    // Make the request
    const response = await fetch(url, {
      method: method || 'GET',
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    // Get the response data
    const data = await response.json().catch(() => ({}));

    // Return the response
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in supabase-proxy API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
}
