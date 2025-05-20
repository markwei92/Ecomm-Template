import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, Loader, X, Edit } from 'lucide-react';
import { toast } from 'react-toastify';
import { LogoEditor } from './LogoEditor';
import {
  LogoSettings,
  SiteTitleSettings,
  fetchLogoSettings,
  fetchSiteTitleSettings,
  updateLogoSettings,
  updateSiteTitleSettings,
  uploadLogoImage
} from '../../services/siteSettingsService';

interface SiteLogoProps {
  isAuthenticated: boolean | null;
}

export const SiteLogo: React.FC<SiteLogoProps> = ({ isAuthenticated }) => {
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
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [tempLogoUrl, setTempLogoUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch logo and title settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);

        // Fetch logo settings
        const logo = await fetchLogoSettings();
        setLogoSettings(logo);

        // Fetch title settings
        const title = await fetchSiteTitleSettings();
        setTitleSettings(title);
      } catch (error: any) {
        console.error('Error fetching settings:', error);
        toast.error(`Error loading settings: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Handle logo image selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLogoFile(file);

      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);

      // Open the editor with the new image
      setEditingImageUrl(previewUrl);
      setIsEditorOpen(true);
    }
  };

  // Handle opening the editor for an existing image
  const handleEditLogo = () => {
    if (logoSettings.image_url) {
      setEditingImageUrl(logoSettings.image_url);
      setIsEditorOpen(true);
    }
  };

  // Handle saving the edited image
  const handleSaveEditedLogo = (dataUrl: string) => {
    setTempLogoUrl(dataUrl);
    setLogoSettings({
      ...logoSettings,
      image_url: dataUrl
    });
    setIsEditorOpen(false);

    // Convert data URL to File object for upload
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "logo.png", { type: "image/png" });
        setLogoFile(file);
      })
      .catch(err => {
        console.error("Error converting data URL to file:", err);
      });
  };

  // Handle canceling the editor
  const handleCancelEdit = () => {
    setIsEditorOpen(false);

    // If this was a new upload and user canceled, reset the logo file
    if (!logoSettings.image_url && logoFile) {
      setLogoFile(null);
    }
  };

  // Handle saving settings
  const handleSaveSettings = async () => {
    if (isAuthenticated === false) {
      toast.error('You must be logged in to save settings');
      return;
    }

    try {
      setIsSaving(true);

      // Upload logo image if a new one was selected
      let logoUrl = logoSettings.image_url;
      if (logoFile) {
        try {
          logoUrl = await uploadLogoImage(logoFile);
        } catch (uploadError: any) {
          console.error('Error uploading logo image:', uploadError);
          toast.error(`Error uploading logo image: ${uploadError.message}`);
          setIsSaving(false);
          return;
        }
      }

      // Update logo settings
      try {
        await updateLogoSettings({
          ...logoSettings,
          image_url: logoUrl
        });
      } catch (logoError: any) {
        console.error('Error updating logo settings:', logoError);
        toast.error(`Error updating logo settings: ${logoError.message}`);
        setIsSaving(false);
        return;
      }

      // Update title settings
      try {
        await updateSiteTitleSettings(titleSettings);
      } catch (titleError: any) {
        console.error('Error updating title settings:', titleError);
        toast.error(`Error updating title settings: ${titleError.message}`);
        setIsSaving(false);
        return;
      }

      toast.success('Site settings updated successfully');

      // Clear the file input
      setLogoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`Error saving settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">Site Logo & Title</h2>

      {isAuthenticated === false ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>You must be logged in to manage site logo and title.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Logo</h3>

            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Logo Preview */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium text-gray-500">Preview:</div>
                    {logoSettings.image_url && (
                      <button
                        type="button"
                        onClick={handleEditLogo}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit Image
                      </button>
                    )}
                  </div>
                  <div className={`flex ${logoSettings.alignment === 'center' ? 'justify-center' :
                    logoSettings.alignment === 'right' ? 'justify-end' : 'justify-start'
                    }`}>
                    {logoSettings.image_url ? (
                      <div className="relative">
                        <img
                          src={logoSettings.image_url}
                          alt={logoSettings.alt_text}
                          className="max-h-16 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 bg-gray-200 flex items-center justify-center rounded">
                        <span className="text-gray-400 text-xs">No logo</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo Image
                  </label>
                  <div className="mt-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {logoSettings.image_url ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    {logoSettings.image_url && (
                      <button
                        type="button"
                        onClick={() => setLogoSettings({ ...logoSettings, image_url: '' })}
                        className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    PNG, JPG, GIF up to 2MB. Recommended size: 200x50px.
                  </p>
                </div>

                {/* Alt Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alt Text
                  </label>
                  <input
                    type="text"
                    value={logoSettings.alt_text}
                    onChange={(e) => setLogoSettings({ ...logoSettings, alt_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Logo Alt Text"
                  />
                </div>

                {/* Alignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alignment
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="alignment"
                        value="left"
                        checked={logoSettings.alignment === 'left'}
                        onChange={() => setLogoSettings({ ...logoSettings, alignment: 'left' })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Left</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="alignment"
                        value="center"
                        checked={logoSettings.alignment === 'center'}
                        onChange={() => setLogoSettings({ ...logoSettings, alignment: 'center' })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Center</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="alignment"
                        value="right"
                        checked={logoSettings.alignment === 'right'}
                        onChange={() => setLogoSettings({ ...logoSettings, alignment: 'right' })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Right</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Site Title</h3>

            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Title Preview */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="text-sm font-medium text-gray-500 mb-2">Preview:</div>
                  <div className="flex justify-center">
                    <h1
                      className="text-2xl font-bold"
                      style={{ color: titleSettings.color }}
                    >
                      {titleSettings.text}
                    </h1>
                  </div>
                </div>

                {/* Title Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title Text
                  </label>
                  <input
                    type="text"
                    value={titleSettings.text}
                    onChange={(e) => setTitleSettings({ ...titleSettings, text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Site Title"
                  />
                </div>

                {/* Title Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title Color
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      value={titleSettings.color}
                      onChange={(e) => setTitleSettings({ ...titleSettings, color: e.target.value })}
                      className="w-10 h-10 border border-gray-300 rounded-md mr-2"
                    />
                    <input
                      type="text"
                      value={titleSettings.color}
                      onChange={(e) => setTitleSettings({ ...titleSettings, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logo Editor Modal */}
      {isEditorOpen && editingImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <LogoEditor
            imageUrl={editingImageUrl}
            onSave={handleSaveEditedLogo}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving || isAuthenticated === false}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${isSaving || isAuthenticated === false
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
    </div>
  );
};
