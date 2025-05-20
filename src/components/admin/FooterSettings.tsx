import React, { useState, useEffect } from 'react';
import { Save, Loader, RefreshCw, Plus, Trash2, Upload, X, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { FooterSettings as FooterSettingsType, PaymentProvider, fetchFooterSettings, updateFooterSettings } from '../../services/siteSettingsService';
import { uploadLogoImage } from '../../services/siteSettingsService';

interface FooterSettingsProps {
  isAuthenticated: boolean | null;
}

export const FooterSettings: React.FC<FooterSettingsProps> = ({ isAuthenticated }) => {
  const [settings, setSettings] = useState<FooterSettingsType>({
    copyright_text: '© {year} FunnyJokeTees.',
    brand_text: 'An OpenStore Brand.',
    payment_providers: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newProvider, setNewProvider] = useState<PaymentProvider>({
    id: '',
    name: '',
    image_url: '',
    enabled: true,
    link_url: ''
  });
  const [showNewProviderForm, setShowNewProviderForm] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const footerSettings = await fetchFooterSettings();
        setSettings(footerSettings);
      } catch (error: any) {
        console.error('Error fetching footer settings:', error);
        toast.error(`Error loading footer settings: ${error.message}`);
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
      await updateFooterSettings(settings);
      toast.success('Footer settings saved successfully');
    } catch (error: any) {
      console.error('Error saving footer settings:', error);
      toast.error(`Error saving settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle text input change
  const handleTextChange = (key: keyof FooterSettingsType, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle payment provider change
  const handleProviderChange = (index: number, key: keyof PaymentProvider, value: any) => {
    const updatedProviders = [...settings.payment_providers];
    updatedProviders[index] = {
      ...updatedProviders[index],
      [key]: value
    };
    setSettings(prev => ({
      ...prev,
      payment_providers: updatedProviders
    }));
  };

  // Handle adding a new payment provider
  const handleAddProvider = () => {
    if (!newProvider.name || !newProvider.id) {
      toast.error('Provider name and ID are required');
      return;
    }

    setSettings(prev => ({
      ...prev,
      payment_providers: [...prev.payment_providers, { ...newProvider }]
    }));
    setNewProvider({
      id: '',
      name: '',
      image_url: '',
      enabled: true,
      link_url: ''
    });
    setShowNewProviderForm(false);
  };

  // Handle removing a payment provider
  const handleRemoveProvider = (index: number) => {
    const updatedProviders = [...settings.payment_providers];
    updatedProviders.splice(index, 1);
    setSettings(prev => ({
      ...prev,
      payment_providers: updatedProviders
    }));
  };

  // Handle image upload for a payment provider
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await uploadLogoImage(file);
      handleProviderChange(index, 'image_url', imageUrl);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(`Error uploading image: ${error.message}`);
    }
  };

  // Handle image upload for a new payment provider
  const handleNewProviderImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await uploadLogoImage(file);
      setNewProvider(prev => ({
        ...prev,
        image_url: imageUrl
      }));
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(`Error uploading image: ${error.message}`);
    }
  };

  // Reset to defaults
  const handleResetToDefaults = async () => {
    try {
      setIsLoading(true);
      const defaultSettings = await fetchFooterSettings();
      setSettings(defaultSettings);
      toast.success('Reset to default settings');
    } catch (error: any) {
      console.error('Error resetting to defaults:', error);
      toast.error(`Error resetting: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2">Loading footer settings...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Footer Settings</h2>
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
          <span className="block sm:inline ml-2">You are not logged in. Please log in to manage footer settings.</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Copyright Text Section */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Copyright Text</h3>
          <p className="text-sm text-gray-600 mb-2">
            Use {'{year}'} to automatically insert the current year.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Copyright Text
              </label>
              <input
                type="text"
                value={settings.copyright_text}
                onChange={(e) => handleTextChange('copyright_text', e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="© {year} FunnyJokeTees."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Text
              </label>
              <input
                type="text"
                value={settings.brand_text}
                onChange={(e) => handleTextChange('brand_text', e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="An OpenStore Brand."
              />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <div className="p-2 border rounded bg-gray-50">
              <p className="text-sm">
                {settings.copyright_text.replace('{year}', new Date().getFullYear().toString())} {settings.brand_text}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Providers Section */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Payment Providers</h3>
          <div className="space-y-4">
            {settings.payment_providers.map((provider, index) => (
              <div key={provider.id} className="border rounded p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{provider.name}</h4>
                  <button
                    onClick={() => handleRemoveProvider(index)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove provider"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Provider ID
                    </label>
                    <input
                      type="text"
                      value={provider.id}
                      onChange={(e) => handleProviderChange(index, 'id', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Provider Name
                    </label>
                    <input
                      type="text"
                      value={provider.name}
                      onChange={(e) => handleProviderChange(index, 'name', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Link URL
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={provider.link_url}
                        onChange={(e) => handleProviderChange(index, 'link_url', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded-l focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="https://example.com"
                      />
                      <a
                        href={provider.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-gray-100 border border-l-0 rounded-r hover:bg-gray-200"
                        title="Test link"
                      >
                        <LinkIcon size={16} />
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Enabled
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={provider.enabled}
                        onChange={(e) => handleProviderChange(index, 'enabled', e.target.checked)}
                        className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {provider.enabled ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Image
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-16 bg-gray-100 border rounded flex items-center justify-center overflow-hidden">
                        {provider.image_url ? (
                          <img
                            src={provider.image_url}
                            alt={provider.name}
                            className="h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No image</span>
                        )}
                      </div>
                      <label className="flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer">
                        <Upload size={16} className="mr-1" />
                        <span className="text-xs">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, index)}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={provider.image_url}
                        onChange={(e) => handleProviderChange(index, 'image_url', e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Image URL"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Provider Form */}
            {showNewProviderForm && (
              <div className="border rounded p-3 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">New Payment Provider</h4>
                  <button
                    onClick={() => setShowNewProviderForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Provider ID *
                    </label>
                    <input
                      type="text"
                      value={newProvider.id}
                      onChange={(e) => setNewProvider({ ...newProvider, id: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-black"
                      placeholder="e.g., visa"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Provider Name *
                    </label>
                    <input
                      type="text"
                      value={newProvider.name}
                      onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-black"
                      placeholder="e.g., Visa"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Link URL
                    </label>
                    <input
                      type="text"
                      value={newProvider.link_url}
                      onChange={(e) => setNewProvider({ ...newProvider, link_url: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-black"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Enabled
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newProvider.enabled}
                        onChange={(e) => setNewProvider({ ...newProvider, enabled: e.target.checked })}
                        className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {newProvider.enabled ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Image
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-16 bg-gray-100 border rounded flex items-center justify-center overflow-hidden">
                        {newProvider.image_url ? (
                          <img
                            src={newProvider.image_url}
                            alt="New provider"
                            className="h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No image</span>
                        )}
                      </div>
                      <label className="flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer">
                        <Upload size={16} className="mr-1" />
                        <span className="text-xs">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleNewProviderImageUpload}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={newProvider.image_url}
                        onChange={(e) => setNewProvider({ ...newProvider, image_url: e.target.value })}
                        className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Image URL"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleAddProvider}
                    className="px-3 py-1 bg-black text-white text-sm rounded hover:bg-gray-800"
                  >
                    Add Provider
                  </button>
                </div>
              </div>
            )}

            {/* Add New Provider Button */}
            {!showNewProviderForm && (
              <button
                onClick={() => setShowNewProviderForm(true)}
                className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 w-full justify-center"
              >
                <Plus size={16} className="mr-1" />
                Add Payment Provider
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500 mt-4">
          <p>Note: Changes will be applied after saving and may require a page refresh to fully take effect.</p>
        </div>
      </div>
    </div>
  );
};
