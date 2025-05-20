/*
  # Fix inquiries table RLS policies

  1. Changes
    - Drop existing table and policies
    - Recreate table with proper structure
    - Add policies that allow public access for all operations
*/

-- Drop existing table
DROP TABLE IF EXISTS inquiries;

-- Create inquiries table
CREATE TABLE inquiries (
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
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Create policies with public access
CREATE POLICY "enable_public_insert"
  ON inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "enable_public_select"
  ON inquiries
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "enable_public_update"
  ON inquiries
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX inquiries_status_idx ON inquiries(status);
CREATE INDEX inquiries_created_at_idx ON inquiries(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();