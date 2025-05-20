import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { setToastEnabled } from '../utils/toastInterceptor';

interface ToastSettings {
  enabled: boolean;
}

interface ToastContextType {
  toastSettings: ToastSettings;
  updateToastSettings: (settings: ToastSettings) => Promise<void>;
}

const ToastSettingsContext = createContext<ToastContextType | null>(null);

export const useToastSettings = () => {
  const context = useContext(ToastSettingsContext);
  if (!context) {
    throw new Error('useToastSettings must be used within a ToastSettingsProvider');
  }
  return context;
};

interface ToastSettingsProviderProps {
  children: ReactNode;
}

export const ToastSettingsProvider: React.FC<ToastSettingsProviderProps> = ({ children }) => {
  const [toastSettings, setToastSettings] = useState<ToastSettings>({
    enabled: true, // Default to enabled
  });

  useEffect(() => {
    console.log('ToastSettingsProvider initialized');

    // Force enable toast notifications for debugging
    setToastEnabled(true);
    console.log('Toast notifications forcibly enabled for debugging');

    const fetchToastSettings = async () => {
      try {
        console.log('Fetching toast settings from database');
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'toast_notifications')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching toast settings:', error);
          return;
        }

        if (data) {
          console.log('Toast settings from database:', data);
          const settings = data.setting_value as ToastSettings;
          setToastSettings(settings);
          // Update the global toast interceptor
          setToastEnabled(settings.enabled);
          console.log('Toast notifications enabled state set to:', settings.enabled);
        } else {
          console.log('No toast settings found in database, using defaults');
          // Ensure toasts are enabled by default
          setToastSettings({ enabled: true });
          setToastEnabled(true);
        }
      } catch (error) {
        console.error('Error fetching toast settings:', error);
        // Ensure toasts are enabled even if there's an error
        setToastSettings({ enabled: true });
        setToastEnabled(true);
      }
    };

    fetchToastSettings();

    // Test toast directly from context
    setTimeout(() => {
      console.log('Testing toast from ToastSettingsContext');
      toast.info('Toast from context initialization');
    }, 3000);
  }, []);

  const updateToastSettings = async (settings: ToastSettings) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'toast_notifications',
          setting_value: settings
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error('Error saving toast settings:', error);
        throw error;
      }

      // Update the global toast interceptor
      setToastEnabled(settings.enabled);

      // Update local state
      setToastSettings(settings);

      // Only show this toast if we're enabling notifications
      if (settings.enabled) {
        toast.success('Toast notification settings updated');
      }
    } catch (error) {
      console.error('Error updating toast settings:', error);
      if (toastSettings.enabled) {
        toast.error('Failed to update toast notification settings');
      }
    }
  };

  return (
    <ToastSettingsContext.Provider value={{ toastSettings, updateToastSettings }}>
      {children}
    </ToastSettingsContext.Provider>
  );
};
