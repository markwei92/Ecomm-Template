import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AnnouncementBannerProps {
  message?: string;
  forceShow?: boolean;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  message,
  forceShow = false
}) => {
  const defaultMessage = '30 DAYS NO REASON RETURN · 180 DAYS QUALITY OF EXCHANGE OR REFUND · LOWEST PRICE GUARANTEE · 7 DAYS DOA PRODUCT GUARANTEE';
  const [isVisible, setIsVisible] = useState(false); // Start with not visible
  const [bannerMessage, setBannerMessage] = useState(message || defaultMessage);
  const [isEnabled, setIsEnabled] = useState(false); // Start with disabled
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch banner settings from database
  useEffect(() => {
    const fetchBannerSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'announcement_banner')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching banner settings:', error);
          setIsInitialized(true);
          return;
        }

        if (data && data.setting_value) {
          const settings = data.setting_value;
          if (!message) {
            setBannerMessage(settings.message);
          }
          setIsEnabled(settings.is_enabled);
        }

        // Mark as initialized after fetching settings
        setIsInitialized(true);
      } catch (error) {
        console.error('Error fetching banner settings:', error);
        setIsInitialized(true);
      }
    };

    if (forceShow) {
      // If forced to show, mark as initialized and set visible
      setIsEnabled(true);
      setIsVisible(true);
      setIsInitialized(true);
    } else {
      fetchBannerSettings();
    }
  }, [message, forceShow]);

  // Check if the banner should be visible after initialization
  useEffect(() => {
    if (!isInitialized) return;

    if (forceShow) {
      // If forced to show, always show
      setIsVisible(true);
      return;
    }

    // Check if the banner was closed in the current session
    const bannerClosed = sessionStorage.getItem('bannerClosed');

    if (isEnabled) {
      // Only show if enabled and not manually closed
      setIsVisible(bannerClosed !== 'true');

      if (bannerClosed !== 'true') {
        // Clear any previous closed state if we're showing the banner
        sessionStorage.removeItem('bannerClosed');
      }
    } else {
      // If disabled, never show
      setIsVisible(false);
    }
  }, [isInitialized, isEnabled, forceShow]);

  const closeBanner = () => {
    setIsVisible(false);

    // Store the closed state in session storage
    sessionStorage.setItem('bannerClosed', 'true');

    // Dispatch a custom event to notify the navbar
    window.dispatchEvent(new CustomEvent('bannerVisibilityChanged'));
  };

  // Don't render if banner is not initialized, not visible, or not enabled (unless forced)
  if (!isInitialized || (!isEnabled && !forceShow) || (!isVisible && !forceShow)) {
    return null;
  }

  return (
    <div className="h-8 bg-black text-white sticky top-0 z-50">
      <div className="container mx-auto h-full flex items-center justify-center relative">
        <p className="pr-8 truncate">{bannerMessage}</p>
        {!forceShow && (
          <button
            onClick={closeBanner}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
            aria-label="Close announcement"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
