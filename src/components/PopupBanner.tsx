import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PopupBannerProps {
  forceShow?: boolean;
}

interface PopupBannerSettings {
  is_enabled: boolean;
  layout: 'square' | 'horizontal' | 'vertical';
  rounded_edges: boolean;
  image_url: string;
  background_color: string;
  content: string;
}

export const PopupBanner: React.FC<PopupBannerProps> = ({
  forceShow = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<PopupBannerSettings>({
    is_enabled: false,
    layout: 'square',
    rounded_edges: true,
    image_url: '',
    background_color: '#ffffff',
    content: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch popup banner settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching popup banner settings...');

        // Clear the popup closed state on page load to ensure it appears on refresh
        sessionStorage.removeItem('popupBannerClosed');

        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'popup_banner')
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // PGRST116 is "no rows returned"
            console.log('No popup banner settings found, creating default settings');
            // Create default settings if none exist
            const defaultSettings: PopupBannerSettings = {
              is_enabled: true,
              layout: 'square',
              rounded_edges: true,
              image_url: '',
              background_color: '#ffffff',
              content: '<h2 style="font-size: 24px; color: #000;">Welcome to FunnyJokeTees!</h2><p style="margin-top: 10px; color: #333;">Check out our latest collection of funny t-shirts.</p>'
            };

            // Save default settings
            try {
              await supabase
                .from('site_settings')
                .upsert({
                  setting_key: 'popup_banner',
                  setting_value: defaultSettings
                });

              setSettings(defaultSettings);

              // Always show the banner on page load
              setIsVisible(true);
            } catch (saveError) {
              console.error('Error saving default popup banner settings:', saveError);
            }
          } else {
            console.error('Error fetching popup banner settings:', error);
          }
        } else if (data) {
          console.log('Popup banner settings found:', data.setting_value);
          setSettings(data.setting_value as PopupBannerSettings);

          // Always show the banner if it's enabled
          if (data.setting_value.is_enabled) {
            console.log('Setting banner to visible');
            setIsVisible(true);
          }
        }
      } catch (error: any) {
        console.error('Error fetching popup banner settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const closePopup = () => {
    console.log('Close popup button clicked');
    setIsVisible(false);
    // Store the closed state in session storage
    sessionStorage.setItem('popupBannerClosed', 'true');
  };

  // Don't render if banner is not visible or not enabled (unless forced)
  if (isLoading || (!settings.is_enabled && !forceShow) || (!isVisible && !forceShow)) {
    console.log('PopupBanner not rendering because:', {
      isLoading,
      isEnabled: settings.is_enabled,
      isVisible,
      forceShow
    });
    return null;
  }

  console.log('PopupBanner rendering with settings:', settings);

  // Determine layout class based on settings
  const getLayoutClass = () => {
    switch (settings.layout) {
      case 'horizontal':
        return 'w-[80%] max-w-4xl h-auto aspect-[16/9]';
      case 'vertical':
        return 'w-[90%] max-w-md h-auto aspect-[9/16]';
      case 'square':
      default:
        return 'w-[90%] max-w-xl h-auto aspect-square';
    }
  };

  // Determine border radius based on settings
  const getBorderRadius = () => {
    return settings.rounded_edges ? 'rounded-lg' : '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`relative ${getLayoutClass()}`}>
        {/* Close button - positioned outside the banner */}
        <button
          onClick={closePopup}
          className="absolute -top-10 -right-10 z-50 p-2 bg-white bg-opacity-80 rounded-full text-black hover:bg-opacity-100 transition-all shadow-md"
          aria-label="Close popup"
        >
          <X size={24} />
        </button>

        {/* Banner content */}
        <div
          className={`w-full h-full overflow-hidden ${getBorderRadius()} bg-white flex flex-col`}
          style={{ backgroundColor: settings.background_color }}
        >

          {settings.image_url && (
            <div className="w-full h-full relative">
              <img
                src={settings.image_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
              {settings.content && (
                <div className="absolute inset-0 p-0">
                  <div
                    className="relative w-full h-full"
                    dangerouslySetInnerHTML={{ __html: settings.content }}
                  />
                </div>
              )}
            </div>
          )}

          {!settings.image_url && settings.content && (
            <div className="w-full h-full relative p-0">
              <div
                className="relative w-full h-full"
                dangerouslySetInnerHTML={{ __html: settings.content }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
