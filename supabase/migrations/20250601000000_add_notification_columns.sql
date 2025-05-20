/*
  # Add notification columns to track viewed status
  
  1. Changes
    - Add `viewed` column to `stripe_orders` table
    - Add `viewed` column to `inquiries` table
    - Create `user_notifications` table for tracking new user registrations
*/

-- Add viewed column to stripe_orders table
ALTER TABLE stripe_orders
ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE;

-- Add viewed column to inquiries table
ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE;

-- Create user_notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access to user_notifications
CREATE POLICY "Admins can manage user_notifications"
  ON user_notifications
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create trigger to automatically create a notification when a new user registers
CREATE OR REPLACE FUNCTION create_user_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notifications (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_notification();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_orders_viewed ON stripe_orders(viewed);
CREATE INDEX IF NOT EXISTS idx_inquiries_viewed ON inquiries(viewed);
CREATE INDEX IF NOT EXISTS idx_user_notifications_viewed ON user_notifications(viewed);
