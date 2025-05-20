import React, { useState, useEffect } from 'react';
import { Save, Loader, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { ThemeColorSettings, fetchThemeColorSettings, updateThemeColorSettings } from '../../services/siteSettingsService';

interface ThemeColorsProps {
  isAuthenticated: boolean | null;
}

export const ThemeColors: React.FC<ThemeColorsProps> = ({ isAuthenticated }) => {
  const [settings, setSettings] = useState<ThemeColorSettings>({
    navbarBackground: '#FFFFFF', // White
    navbarText: '#000000', // Black
    bodyBackground: '#FFFFFF', // White
    footerBackground: '#f8e8e4', // Current footer color
    footerText: '#4B5563', // Gray-700
    footerButtonBackground: '#9333EA', // Purple-600
    footerButtonText: '#FFFFFF' // White
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewNavbarBackground, setPreviewNavbarBackground] = useState('#FFFFFF');
  const [previewNavbarText, setPreviewNavbarText] = useState('#000000');
  const [previewFooterBackground, setPreviewFooterBackground] = useState('#f8e8e4');
  const [previewFooterText, setPreviewFooterText] = useState('#4B5563');
  const [previewFooterButtonBackground, setPreviewFooterButtonBackground] = useState('#9333EA');
  const [previewFooterButtonText, setPreviewFooterButtonText] = useState('#FFFFFF');

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const themeColors = await fetchThemeColorSettings();
        setSettings(themeColors);
        setPreviewNavbarBackground(themeColors.navbarBackground);
        setPreviewNavbarText(themeColors.navbarText);
        setPreviewFooterBackground(themeColors.footerBackground);
        setPreviewFooterText(themeColors.footerText);
        setPreviewFooterButtonBackground(themeColors.footerButtonBackground);
        setPreviewFooterButtonText(themeColors.footerButtonText);
      } catch (error: any) {
        console.error('Error fetching theme color settings:', error);
        toast.error(`Error loading theme settings: ${error.message}`);
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
      await updateThemeColorSettings(settings);
      toast.success('Theme color settings saved successfully');

      // Apply the changes to the preview
      setPreviewNavbarBackground(settings.navbarBackground);
      setPreviewNavbarText(settings.navbarText);
      setPreviewFooterBackground(settings.footerBackground);
      setPreviewFooterText(settings.footerText);
      setPreviewFooterButtonBackground(settings.footerButtonBackground);
      setPreviewFooterButtonText(settings.footerButtonText);

      // Apply the changes to the actual elements
      document.documentElement.style.setProperty('--navbar-bg-color', settings.navbarBackground);
      document.documentElement.style.setProperty('--navbar-text-color', settings.navbarText);
      document.documentElement.style.setProperty('--footer-bg-color', settings.footerBackground);
      document.documentElement.style.setProperty('--footer-text-color', settings.footerText);
      document.documentElement.style.setProperty('--footer-button-bg-color', settings.footerButtonBackground);
      document.documentElement.style.setProperty('--footer-button-text-color', settings.footerButtonText);

      // Create a semi-transparent version of the footer text color for the border
      const footerTextColor = settings.footerText;
      // Convert hex to rgba with 0.2 opacity
      let borderColor;
      if (footerTextColor.startsWith('#')) {
        // Parse the hex color
        const r = parseInt(footerTextColor.slice(1, 3), 16);
        const g = parseInt(footerTextColor.slice(3, 5), 16);
        const b = parseInt(footerTextColor.slice(5, 7), 16);
        borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
      } else {
        // Fallback if not hex
        borderColor = footerTextColor;
      }

      document.documentElement.style.setProperty('--footer-border-color', borderColor);

      // Cache the colors in localStorage for faster loading next time
      localStorage.setItem('themeColors', JSON.stringify(settings));

    } catch (error: any) {
      console.error('Error saving theme color settings:', error);
      toast.error(`Error saving settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle color input change
  const handleColorChange = (key: keyof ThemeColorSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    setSettings({
      navbarBackground: '#FFFFFF', // White
      navbarText: '#000000', // Black
      bodyBackground: '#FFFFFF', // White
      footerBackground: '#f8e8e4', // Current footer color
      footerText: '#4B5563', // Gray-700
      footerButtonBackground: '#9333EA', // Purple-600
      footerButtonText: '#FFFFFF' // White
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2">Loading theme settings...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Theme Colors</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleResetToDefaults}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            disabled={isSaving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            className="flex items-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {isAuthenticated === false && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Authentication Error!</strong>
          <span className="block sm:inline ml-2">You are not logged in. Please log in to manage theme settings.</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Navbar Color Section */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Navbar</h3>

          {/* Preview */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <div
              className="h-16 rounded border flex items-center justify-between px-4"
              style={{ backgroundColor: previewNavbarBackground }}
            >
              <div className="font-bold" style={{ color: previewNavbarText }}>Navbar Preview</div>
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-full" style={{ color: previewNavbarText }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <div className="p-2 rounded-full" style={{ color: previewNavbarText }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                  </svg>
                </div>
                <div className="relative p-2 rounded-full" style={{ color: previewNavbarText }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={settings.navbarBackground}
                  onChange={(e) => handleColorChange('navbarBackground', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.navbarBackground}
                  onChange={(e) => handleColorChange('navbarBackground', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text & Icons Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={settings.navbarText}
                  onChange={(e) => handleColorChange('navbarText', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.navbarText}
                  onChange={(e) => handleColorChange('navbarText', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Color Section */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Footer</h3>

          {/* Preview */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <div
              className="rounded border overflow-hidden"
              style={{ backgroundColor: previewFooterBackground }}
            >
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold mb-2" style={{ color: previewFooterText }}>Footer Links</h4>
                    <ul>
                      <li style={{ color: previewFooterText }}>Customer Care</li>
                      <li style={{ color: previewFooterText }}>About Us</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2" style={{ color: previewFooterText }}>Subscribe</h4>
                    <p className="text-sm mb-2" style={{ color: previewFooterText }}>Sign up for free discounts!</p>
                    <div className="flex flex-col space-y-2">
                      <input
                        type="text"
                        placeholder="Email"
                        className="px-2 py-1 border text-sm"
                        disabled
                      />
                      <button
                        className="px-3 py-1 text-sm rounded"
                        style={{
                          backgroundColor: previewFooterButtonBackground,
                          color: previewFooterButtonText
                        }}
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-2 border-t" style={{
                  borderColor: `rgba(${parseInt(previewFooterText.slice(1, 3), 16)}, ${parseInt(previewFooterText.slice(3, 5), 16)}, ${parseInt(previewFooterText.slice(5, 7), 16)}, 0.2)`
                }}>
                  <p className="text-xs" style={{ color: previewFooterText }}>© 2023 FunnyJokeTees</p>
                </div>
              </div>
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={settings.footerBackground}
                  onChange={(e) => handleColorChange('footerBackground', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.footerBackground}
                  onChange={(e) => handleColorChange('footerBackground', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="#f8e8e4"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={settings.footerText}
                  onChange={(e) => handleColorChange('footerText', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.footerText}
                  onChange={(e) => handleColorChange('footerText', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="#4B5563"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Button Background Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={settings.footerButtonBackground}
                  onChange={(e) => handleColorChange('footerButtonBackground', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.footerButtonBackground}
                  onChange={(e) => handleColorChange('footerButtonBackground', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="#9333EA"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Button Text Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={settings.footerButtonText}
                  onChange={(e) => handleColorChange('footerButtonText', e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.footerButtonText}
                  onChange={(e) => handleColorChange('footerButtonText', e.target.value)}
                  className="ml-2 flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 mt-4">
          <p>Note: Changes will be applied after saving and may require a page refresh to fully take effect.</p>
        </div>
      </div>
    </div >
  );
};
