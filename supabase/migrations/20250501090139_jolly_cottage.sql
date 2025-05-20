-- Drop existing table and related objects
DROP TABLE IF EXISTS inquiries CASCADE;

-- Create inquiries table
CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "enable_insert_for_all_users"
  ON public.inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "enable_select_for_all_users"
  ON public.inquiries
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "enable_update_for_all_users"
  ON public.inquiries
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX inquiries_status_idx ON public.inquiries(status);
CREATE INDEX inquiries_created_at_idx ON public.inquiries(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();