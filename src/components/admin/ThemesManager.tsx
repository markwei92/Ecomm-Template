import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, Loader, X, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';
import { ConfirmationDialog } from '../ConfirmationDialog';

interface ThemesManagerProps {
  isAuthenticated: boolean | null;
}

interface Theme {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  created_at: string;
}

export const ThemesManager: React.FC<ThemesManagerProps> = ({ isAuthenticated }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTheme, setEditingTheme] = useState<{ id?: string; name: string; slug: string }>({ name: '', slug: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all themes with product counts
  const fetchThemes = async () => {
    try {
      setIsLoading(true);
      
      // Get themes with product counts
      const { data, error } = await supabase.rpc('get_themes_with_product_count');
      
      if (error) throw error;
      
      setThemes(data || []);
    } catch (error: any) {
      console.error('Failed to load themes:', error);
      toast.error(`Error loading themes: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data loading
  useEffect(() => {
    fetchThemes();
  }, []);

  // Handle creating a new theme
  const handleCreateTheme = () => {
    setEditingTheme({ name: '', slug: '' });
    setIsEditing(true);
  };

  // Handle editing an existing theme
  const handleEditTheme = (theme: Theme) => {
    setEditingTheme({ 
      id: theme.id,
      name: theme.name,
      slug: theme.slug
    });
    setIsEditing(true);
  };

  // Handle saving a theme
  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAuthenticated === false) {
      toast.error('You must be logged in to save themes');
      return;
    }
    
    if (!editingTheme.name.trim()) {
      toast.error('Theme name is required');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Generate slug if not provided
      if (!editingTheme.slug.trim()) {
        editingTheme.slug = editingTheme.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      
      let result;
      
      if (editingTheme.id) {
        // Update existing theme
        const { data, error } = await supabase
          .from('themes')
          .update({
            name: editingTheme.name,
            slug: editingTheme.slug
          })
          .eq('id', editingTheme.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        toast.success('Theme updated successfully');
      } else {
        // Create new theme
        const { data, error } = await supabase
          .from('themes')
          .insert({
            name: editingTheme.name,
            slug: editingTheme.slug
          })
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        toast.success('Theme created successfully');
      }
      
      // Refresh the themes list
      await fetchThemes();
      
      setIsEditing(false);
      setEditingTheme({ name: '', slug: '' });
    } catch (error: any) {
      console.error('Error saving theme:', error);
      toast.error(`Error saving theme: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle theme deletion
  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      // Get the theme to be deleted
      const themeToDelete = themes.find(t => t.id === deleteId);
      
      if (!themeToDelete) {
        toast.error('Theme not found');
        return;
      }
      
      // If theme has products, reassign them to "others" theme
      if (themeToDelete.product_count > 0) {
        // Find or create the "others" theme
        let othersTheme = themes.find(t => t.slug === 'others');
        
        if (!othersTheme) {
          // Create the "others" theme if it doesn't exist
          const { data, error } = await supabase
            .from('themes')
            .insert({
              name: 'Others',
              slug: 'others'
            })
            .select()
            .single();
            
          if (error) throw error;
          othersTheme = data;
        }
        
        // Update all products that use the deleted theme to use "others" instead
        const { error: updateError } = await supabase.rpc('reassign_products_to_others_theme', {
          old_theme_slug: themeToDelete.slug,
          new_theme_slug: 'others'
        });
        
        if (updateError) throw updateError;
      }
      
      // Delete the theme
      const { error } = await supabase
        .from('themes')
        .delete()
        .eq('id', deleteId);
        
      if (error) throw error;
      
      toast.success('Theme deleted successfully');
      
      // Refresh the themes list
      await fetchThemes();
    } catch (error: any) {
      console.error('Error during theme deletion:', error);
      toast.error(`Error deleting theme: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      {isAuthenticated === false ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>You must be logged in to manage themes.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Product Themes</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchThemes()}
                className="p-1 rounded-full hover:bg-gray-200"
                title="Refresh themes"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleCreateTheme}
                disabled={isAuthenticated === false}
                className={`flex items-center px-3 py-1 rounded-md ${
                  isAuthenticated === false
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Theme
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : themes.length === 0 ? (
            <div className="text-center py-8 bg-gray-100 rounded-lg">
              <p className="text-gray-500 mb-2">No themes found</p>
              <button
                onClick={handleCreateTheme}
                className="bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Create First Theme
              </button>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {themes.map((theme) => (
                  <li key={theme.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{theme.name}</h4>
                        <p className="text-sm text-gray-500">Slug: {theme.slug}</p>
                        <p className="text-sm text-gray-500">
                          {theme.product_count} {theme.product_count === 1 ? 'product' : 'products'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTheme(theme)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(theme.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          disabled={theme.slug === 'others'}
                          title={theme.slug === 'others' ? "Cannot delete 'Others' theme" : "Delete theme"}
                        >
                          <Trash2 className={`w-5 h-5 ${theme.slug === 'others' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Edit Theme Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTheme.id ? 'Edit Theme' : 'Create Theme'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveTheme}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="theme-name" className="block text-sm font-medium text-gray-700">
                    Theme Name
                  </label>
                  <input
                    type="text"
                    id="theme-name"
                    value={editingTheme.name}
                    onChange={(e) => setEditingTheme({ ...editingTheme, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="theme-slug" className="block text-sm font-medium text-gray-700">
                    Slug (optional)
                  </label>
                  <input
                    type="text"
                    id="theme-slug"
                    value={editingTheme.slug}
                    onChange={(e) => setEditingTheme({ ...editingTheme, slug: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                    placeholder="auto-generated-if-empty"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Used in URLs and filters. Will be auto-generated if left empty.
                  </p>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex justify-center items-center bg-black py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  {isSaving ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleting}
        title="Delete Theme"
        message={
          themes.find(t => t.id === deleteId)?.product_count ? 
          `This theme has ${themes.find(t => t.id === deleteId)?.product_count} products. They will be reassigned to the "Others" theme. Are you sure you want to delete this theme?` :
          "Are you sure you want to delete this theme?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleting(false)}
        type="danger"
      />
    </div>
  );
};
