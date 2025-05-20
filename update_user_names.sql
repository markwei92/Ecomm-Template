-- SQL script to update user names in profiles table
-- Run this in the Supabase SQL Editor

-- First, let's check which users have missing names in profiles
SELECT 
  u.id, 
  u.email, 
  p.first_name, 
  p.last_name,
  u.raw_user_meta_data->>'firstName' as meta_first_name,
  u.raw_user_meta_data->>'lastName' as meta_last_name,
  u.raw_user_meta_data->>'first_name' as meta_first_name_alt,
  u.raw_user_meta_data->>'last_name' as meta_last_name_alt
FROM 
  auth.users u
LEFT JOIN 
  profiles p ON u.id = p.id
WHERE 
  (p.first_name IS NULL OR p.first_name = '') OR
  (p.last_name IS NULL OR p.last_name = '')
ORDER BY 
  u.created_at DESC
LIMIT 10;

-- Update profiles with names from auth.users metadata
DO $$
DECLARE
  user_record RECORD;
  first_name_value TEXT;
  last_name_value TEXT;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through users with missing names
  FOR user_record IN 
    SELECT 
      u.id, 
      u.email, 
      p.id as profile_id,
      u.raw_user_meta_data
    FROM 
      auth.users u
    LEFT JOIN 
      profiles p ON u.id = p.id
    WHERE 
      (p.first_name IS NULL OR p.first_name = '' OR p.last_name IS NULL OR p.last_name = '')
    ORDER BY 
      u.created_at DESC
  LOOP
    -- Extract first name from metadata (try different formats)
    first_name_value := COALESCE(
      user_record.raw_user_meta_data->>'firstName',
      user_record.raw_user_meta_data->>'first_name',
      ''
    );
    
    -- Extract last name from metadata (try different formats)
    last_name_value := COALESCE(
      user_record.raw_user_meta_data->>'lastName',
      user_record.raw_user_meta_data->>'last_name',
      ''
    );
    
    -- If we have a profile, update it
    IF user_record.profile_id IS NOT NULL THEN
      UPDATE profiles
      SET 
        first_name = CASE WHEN first_name_value <> '' THEN first_name_value ELSE first_name END,
        last_name = CASE WHEN last_name_value <> '' THEN last_name_value ELSE last_name END,
        updated_at = NOW()
      WHERE 
        id = user_record.id;
        
      updated_count := updated_count + 1;
    -- If we don't have a profile, create one
    ELSE
      INSERT INTO profiles (id, first_name, last_name, created_at, updated_at)
      VALUES (
        user_record.id,
        first_name_value,
        last_name_value,
        NOW(),
        NOW()
      );
      
      updated_count := updated_count + 1;
    END IF;
    
    RAISE NOTICE 'Updated user % (%) with names: % %', 
      user_record.id, user_record.email, first_name_value, last_name_value;
  END LOOP;
  
  RAISE NOTICE 'Updated % user profiles with names from metadata', updated_count;
END
$$;

-- Refresh the admin_user_view to reflect the changes
REFRESH MATERIALIZED VIEW admin_user_view;

-- Check the results
SELECT 
  id, 
  email, 
  first_name, 
  last_name
FROM 
  admin_user_view
ORDER BY 
  registered_at DESC
LIMIT 10;
