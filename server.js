import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// API proxy for deleting users
app.post('/api/delete-user', async (req, res) => {
  try {
    const { userId, serviceKey } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!serviceKey) {
      return res.status(400).json({ error: 'Service key is required' });
    }

    // Get the Supabase URL from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      return res.status(400).json({ error: 'Supabase URL is required' });
    }

    console.log(`Attempting to delete user ${userId} from ${supabaseUrl}`);

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
});

// Proxy all Supabase requests to avoid CORS issues
app.use('/supabase-proxy', createProxyMiddleware({
  target: process.env.VITE_SUPABASE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/supabase-proxy': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add the service role key to the request
    proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`);
    proxyReq.setHeader('apikey', process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
  }
}));

// For any other request, send back the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
