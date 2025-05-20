-- Create mailing_list table for newsletter subscribers
CREATE TABLE IF NOT EXISTS public.mailing_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  viewed BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.mailing_list ENABLE ROW LEVEL SECURITY;

-- Create policy for public to insert (subscribe)
CREATE POLICY "Anyone can subscribe to mailing list"
  ON public.mailing_list
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy for admins to view and manage subscribers
CREATE POLICY "Admins can manage mailing list"
  ON public.mailing_list
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create function to update notification counts
CREATE OR REPLACE FUNCTION get_mailing_list_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM public.mailing_list
  WHERE viewed = FALSE;
  
  RETURN count;
END;
$$;

-- Create function to mark subscribers as viewed
CREATE OR REPLACE FUNCTION mark_mailing_list_viewed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.mailing_list
  SET viewed = TRUE
  WHERE viewed = FALSE;
END;
$$;

-- Update the admin_notification_counts function to include mailing list
CREATE OR REPLACE FUNCTION get_admin_notification_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  orders_count INTEGER;
  inquiries_count INTEGER;
  users_count INTEGER;
  mailing_list_count INTEGER;
BEGIN
  -- Get unviewed orders count
  SELECT COUNT(*) INTO orders_count
  FROM stripe_orders
  WHERE viewed = FALSE;
  
  -- Get unviewed inquiries count
  SELECT COUNT(*) INTO inquiries_count
  FROM inquiries
  WHERE viewed = FALSE;
  
  -- Get unviewed user notifications count
  SELECT COUNT(*) INTO users_count
  FROM user_notifications
  WHERE viewed = FALSE;
  
  -- Get unviewed mailing list subscribers count
  SELECT COUNT(*) INTO mailing_list_count
  FROM mailing_list
  WHERE viewed = FALSE;
  
  RETURN jsonb_build_object(
    'orders', orders_count,
    'inquiries', inquiries_count,
    'users', users_count,
    'mailing_list', mailing_list_count
  );
END;
$$;
