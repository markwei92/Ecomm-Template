import React, { useState, useEffect, useRef } from 'react';
import { Save, Loader, ToggleLeft, ToggleRight, Upload, X, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';
import { uploadBannerImage } from '../../services/bannerService';

interface PopupBannerSettingsProps {
  isAuthenticated: boolean | null;
}

interface PopupBannerSettings {
  is_enabled: boolean;
  layout: 'square' | 'horizontal' | 'vertical';
  rounded_edges: boolean;
  image_url: string;
}

export const PopupBannerSettings: React.FC<PopupBannerSettingsProps> = ({ isAuthenticated }) => {
  const [settings, setSettings] = useState<PopupBannerSettings>({
    is_enabled: false,
    layout: 'square',
    rounded_edges: true,
    image_url: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch popup banner settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'popup_banner')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching popup banner settings:', error);
          toast.error(`Error loading popup banner settings: ${error.message}`);
          return;
        }

        if (data) {
          const settingsData = data.setting_value as PopupBannerSettings;
          setSettings(settingsData);
          if (settingsData.image_url) {
            setPreviewUrl(settingsData.image_url);
          }
        }
      } catch (error: any) {
        console.error('Error fetching popup banner settings:', error);
        toast.error(`Error loading popup banner settings: ${error.message}`);
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

      // Upload image if a new one is selected
      let updatedSettings = { ...settings };
      if (bannerImage) {
        try {
          const imageUrl = await uploadBannerImage(bannerImage);
          updatedSettings.image_url = imageUrl;
        } catch (error: any) {
          console.error('Error uploading banner image:', error);
          toast.error(`Error uploading image: ${error.message}`);
          setIsSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'popup_banner',
          setting_value: updatedSettings
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error('Error saving popup banner settings:', error);
        toast.error(`Error saving popup banner settings: ${error.message}`);
        return;
      }

      // Update local state with the new settings
      setSettings(updatedSettings);
      toast.success('Popup banner settings saved successfully');

      // Clear the file input
      setBannerImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error saving popup banner settings:', error);
      toast.error(`Error saving settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setBannerImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Handle removing the image
  const handleRemoveImage = () => {
    setBannerImage(null);
    setPreviewUrl('');
    setSettings({
      ...settings,
      image_url: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">Popup Banner Settings</h2>

      {isAuthenticated === false ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>You must be logged in to manage popup banner settings.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <>


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
                      {settings.is_enabled ? 'Popup Banner Enabled' : 'Popup Banner Disabled'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {settings.is_enabled
                        ? 'The popup banner will be shown to users on the homepage'
                        : 'The popup banner is currently hidden from users'}
                    </div>
                  </div>
                </label>
              </div>

              {/* Layout Options */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Layout:</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div
                    className={`border p-4 rounded-lg cursor-pointer flex flex-col items-center ${settings.layout === 'square' ? 'border-black bg-gray-50' : 'border-gray-300'}`}
                    onClick={() => setSettings({ ...settings, layout: 'square' })}
                  >
                    <div className="w-16 h-16 bg-gray-300 mb-2"></div>
                    <span>Square</span>
                    {settings.layout === 'square' && <Check className="w-4 h-4 text-green-500 mt-1" />}
                  </div>
                  <div
                    className={`border p-4 rounded-lg cursor-pointer flex flex-col items-center ${settings.layout === 'horizontal' ? 'border-black bg-gray-50' : 'border-gray-300'}`}
                    onClick={() => setSettings({ ...settings, layout: 'horizontal' })}
                  >
                    <div className="w-16 h-9 bg-gray-300 mb-2"></div>
                    <span>Horizontal</span>
                    {settings.layout === 'horizontal' && <Check className="w-4 h-4 text-green-500 mt-1" />}
                  </div>
                  <div
                    className={`border p-4 rounded-lg cursor-pointer flex flex-col items-center ${settings.layout === 'vertical' ? 'border-black bg-gray-50' : 'border-gray-300'}`}
                    onClick={() => setSettings({ ...settings, layout: 'vertical' })}
                  >
                    <div className="w-9 h-16 bg-gray-300 mb-2"></div>
                    <span>Vertical</span>
                    {settings.layout === 'vertical' && <Check className="w-4 h-4 text-green-500 mt-1" />}
                  </div>
                </div>
              </div>

              {/* Rounded Edges Toggle */}
              <div>
                <label className="flex items-center cursor-pointer">
                  <div className="mr-3">
                    {settings.rounded_edges ? (
                      <ToggleRight className="h-6 w-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div onClick={() => setSettings({ ...settings, rounded_edges: !settings.rounded_edges })}>
                    <div className="font-medium">
                      {settings.rounded_edges ? 'Rounded Edges' : 'Square Edges'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {settings.rounded_edges
                        ? 'The popup banner will have rounded corners'
                        : 'The popup banner will have square corners'}
                    </div>
                  </div>
                </label>
              </div>



              {/* Banner Image Upload */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Banner Image:</h3>
                <div className="mb-4">
                  {(previewUrl || settings.image_url) ? (
                    <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                      <img
                        src={previewUrl || settings.image_url}
                        alt="Banner Preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">Click to upload an image</p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>



              {/* Save Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving || isAuthenticated === false}
                  className={`flex items-center px-4 py-2 rounded-md ${isSaving || isAuthenticated === false
                    ? 'bg-gray-300 cursor-not-allowed'
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
                      Save Settings
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