import React, { useState, useEffect } from 'react';
import { Save, Loader, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';
import { AnnouncementBanner } from '../AnnouncementBanner';

interface BannerSettingsProps {
  isAuthenticated: boolean | null;
}

interface BannerSettings {
  message: string;
  is_enabled: boolean;
}

export const BannerSettings: React.FC<BannerSettingsProps> = ({ isAuthenticated }) => {
  const [settings, setSettings] = useState<BannerSettings>({
    message: '30 DAYS NO REASON RETURN · 180 DAYS QUALITY OF EXCHANGE OR REFUND · LOWEST PRICE GUARANTEE · 7 DAYS DOA PRODUCT GUARANTEE',
    is_enabled: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch banner settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'announcement_banner')
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching banner settings:', error);
          toast.error(`Error loading banner settings: ${error.message}`);
          return;
        }
        
        if (data) {
          setSettings(data.setting_value as BannerSettings);
        }
      } catch (error: any) {
        console.error('Error fetching banner settings:', error);
        toast.error(`Error loading banner settings: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  // Handle saving settings
  const handleSaveSettings = async () => {
    if (isAuthenticated === false) {
      toast.error('You must be logged in to save settings');
      return;
    }
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'announcement_banner',
          setting_value: settings
        }, {
          onConflict: 'setting_key'
        });
      
      if (error) {
        console.error('Error saving banner settings:', error);
        toast.error(`Error saving banner settings: ${error.message}`);
        return;
      }
      
      toast.success('Banner settings saved successfully');
    } catch (error: any) {
      console.error('Error saving banner settings:', error);
      toast.error(`Error saving settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">Announcement Banner Settings</h2>
      
      {isAuthenticated === false ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>You must be logged in to manage banner settings.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {/* Banner Preview */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Preview:</h3>
                <div className="border rounded-lg overflow-hidden">
                  <AnnouncementBanner message={settings.message} />
                </div>
              </div>
              
              {/* Banner Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Message
                </label>
                <textarea
                  value={settings.message}
                  onChange={(e) => setSettings({ ...settings, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter announcement message"
                  rows={2}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use · character to add separators between announcements
                </p>
              </div>
              
              {/* Enable/Disable Toggle */}
              <div>
                <label className="flex items-center cursor-pointer">
                  <div className="mr-3">
                    {settings.is_enabled ? (
                      <ToggleRight className="h-6 w-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}>
                    <div className="font-medium">
                      {settings.is_enabled ? 'Banner Enabled' : 'Banner Disabled'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {settings.is_enabled 
                        ? 'The banner is currently visible to users' 
                        : 'The banner is currently hidden from users'}
                    </div>
                  </div>
                </label>
              </div>
              
              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                    isSaving
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
