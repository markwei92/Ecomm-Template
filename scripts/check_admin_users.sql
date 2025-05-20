-- This script checks the admin_users table and shows all admins

-- First, make sure the admin_users table exists
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'admin',
  UNIQUE(user_id)
);

-- List all admin users with their email addresses
SELECT 
  a.id as admin_id,
  a.user_id,
  u.email,
  a.role,
  a.created_at
FROM 
  public.admin_users a
JOIN 
  auth.users u ON a.user_id = u.id
ORDER BY 
  a.created_at DESC;
