/*
  # Fix inquiries table structure and policies
  
  1. Changes
    - Drop existing table and policies
    - Recreate table with proper structure
    - Add public policies for insert and select
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

-- Create policies
CREATE POLICY "public_create_inquiries"
  ON inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "public_select_inquiries"
  ON inquiries
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_update_inquiries"
  ON inquiries
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();