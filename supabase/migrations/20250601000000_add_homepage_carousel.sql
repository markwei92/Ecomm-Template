/*
  # Add homepage carousel table

  1. New Tables
    - `homepage_carousel` - Stores carousel slides for the homepage
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `image_url` (text, required)
      - `button_text` (text, default "Shop Now")
      - `button_link` (text, required)
      - `button_color` (text, default "#FFFFFF")
      - `text_color` (text, default "#FFFFFF")
      - `display_order` (integer, for ordering slides)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create homepage_carousel table
CREATE TABLE IF NOT EXISTS public.homepage_carousel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  button_text text DEFAULT 'Shop Now',
  button_link text NOT NULL,
  button_color text DEFAULT '#FFFFFF',
  text_color text DEFAULT '#FFFFFF',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_homepage_carousel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_homepage_carousel_updated_at
BEFORE UPDATE ON public.homepage_carousel
FOR EACH ROW
EXECUTE FUNCTION update_homepage_carousel_updated_at();

-- Enable Row Level Security
ALTER TABLE public.homepage_carousel ENABLE ROW LEVEL SECURITY;

-- Check if admin_users table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      role TEXT DEFAULT 'admin',
      UNIQUE(user_id)
    );

    -- Add RLS policies for admin_users table
    ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

    -- Policy to allow admins to read admin_users
    CREATE POLICY admin_users_select_policy ON public.admin_users
      FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users)
      );

    RAISE NOTICE 'Created admin_users table';
  END IF;
END
$$;

-- Create policy for admin users to manage carousel
CREATE POLICY "Admin users can manage homepage carousel"
  ON public.homepage_carousel
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_users)
  );

-- Create policy for public to view active carousel items
CREATE POLICY "Public can view active carousel items"
  ON public.homepage_carousel
  FOR SELECT
  TO public
  USING (is_active = true);

-- Insert initial carousel items based on the current hardcoded data
INSERT INTO public.homepage_carousel (title, description, image_url, button_link, display_order)
VALUES
  ('Summer Collection 2025', 'Lightweight fabrics for the perfect summer look', 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&q=80&w=2000&h=800', '/products?theme=casual', 0),
  ('Graphic Tees', 'Express yourself with our unique designs', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=2000&h=800', '/products?theme=graphic', 1),
  ('Limited Edition', 'Get them before they''re gone', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=2000&h=800', '/products?theme=limited', 2);
