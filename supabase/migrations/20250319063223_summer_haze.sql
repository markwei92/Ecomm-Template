/*
  # Create storage bucket for product images
  
  1. Changes
    - Create a new storage bucket named 'products' for storing product images
    - Enable public access to the bucket
    - Set file size limits and allowed mime types
*/

BEGIN;

-- Create the bucket using Supabase's storage schema
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable public access to objects in the products bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public Access Products Bucket'
  ) THEN
    CREATE POLICY "Public Access Products Bucket"
      ON storage.objects
      FOR ALL
      TO public
      USING (bucket_id = 'products');
  END IF;
END
$$;

COMMIT;