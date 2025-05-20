import { useState, useEffect } from 'react';
import { 
  fetchLogoSettings, 
  fetchSiteTitleSettings, 
  LogoSettings, 
  SiteTitleSettings 
} from '../services/siteSettingsService';

interface UseLogoSettingsResult {
  logoSettings: LogoSettings;
  titleSettings: SiteTitleSettings;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook to fetch logo and title settings
 */
export const useLogoSettings = (): UseLogoSettingsResult => {
  const [logoSettings, setLogoSettings] = useState<LogoSettings>({
    image_url: '',
    alt_text: 'FunnyJokeTees',
    alignment: 'left'
  });

  const [titleSettings, setTitleSettings] = useState<SiteTitleSettings>({
    text: 'FunnyJokeTees',
    color: '#000000'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch logo settings
        const logo = await fetchLogoSettings();
        setLogoSettings(logo);

        // Fetch title settings
        const title = await fetchSiteTitleSettings();
        setTitleSettings(title);
      } catch (err: any) {
        console.error('Error fetching logo settings:', err);
        setError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { logoSettings, titleSettings, isLoading, error };
};
