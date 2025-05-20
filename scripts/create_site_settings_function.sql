-- Function to create site_settings table if it doesn't exist
CREATE OR REPLACE FUNCTION create_site_settings_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'site_settings'
  ) THEN
    -- Create the table
    CREATE TABLE public.site_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      setting_key TEXT UNIQUE NOT NULL,
      setting_value JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Add RLS policies
    ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

    -- Policy for admins to read all settings
    CREATE POLICY "Admins can read all settings" 
      ON public.site_settings 
      FOR SELECT 
      TO authenticated 
      USING (auth.uid() IN (
        SELECT user_id FROM public.admin_users
      ));

    -- Policy for admins to insert/update settings
    CREATE POLICY "Admins can insert/update settings" 
      ON public.site_settings 
      FOR ALL 
      TO authenticated 
      USING (auth.uid() IN (
        SELECT user_id FROM public.admin_users
      ));

    -- Policy for public to read certain settings
    CREATE POLICY "Public can read certain settings" 
      ON public.site_settings 
      FOR SELECT 
      TO anon 
      USING (setting_key IN ('announcement_banner', 'site_logo', 'site_title'));

    -- Add trigger for updated_at
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
