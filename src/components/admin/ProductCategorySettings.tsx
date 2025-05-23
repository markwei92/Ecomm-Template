import React, { useState, useEffect } from 'react';
import { Save, Loader, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';
import {
  createCategoriesTableDirect,
  insertCategoryDirect,
  fetchCategoriesDirect,
  deleteCategoryDirect
} from '../../lib/direct-db-operations';

interface ProductCategorySettingsProps {
  isAuthenticated: boolean | null;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export const ProductCategorySettings: React.FC<ProductCategorySettingsProps> = ({ isAuthenticated }) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);

      // Try to create the table if it doesn't exist using direct SQL
      const { success: tableSuccess, message: tableMessage } = await createCategoriesTableDirect();

      if (!tableSuccess) {
        console.log(`Table creation issue: ${tableMessage}`);
        // Don't show error toast for this, just log it
      }

      // Try to fetch categories using direct SQL
      const { success, message, categories: fetchedCategories } = await fetchCategoriesDirect();

      if (!success) {
        console.error(`Error fetching categories: ${message}`);
        setCategories([]);
        return;
      }

      setCategories(fetchedCategories || []);
    } catch (error: any) {
      console.error('Error fetching product categories:', error);
      toast.error(`Error loading product categories: ${error.message}`);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    if (isAuthenticated === false) {
      toast.error('You must be logged in to add categories');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create slug from name
      const slug = newCategoryName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Try to create the table if it doesn't exist using direct SQL
      const { success: tableSuccess, message: tableMessage } = await createCategoriesTableDirect();

      if (!tableSuccess) {
        console.error(`Table creation issue: ${tableMessage}`);
        toast.error('Could not create category table. Please try again later.');
        return;
      }

      // If we get here, the table exists or was created successfully
      toast.info('Attempting to add category...');

      // Now try to insert the new category using direct SQL
      const { success, message, id } = await insertCategoryDirect(newCategoryName, slug);

      if (!success) {
        if (message.includes('already exists')) {
          toast.error('A category with this name already exists');
        } else {
          toast.error(`Error adding category: ${message}`);
        }
        return;
      }

      toast.success('Category added successfully');
      setNewCategoryName('');

      // Wait a moment before fetching categories to ensure the new one is included
      setTimeout(() => {
        fetchCategories();
      }, 500);
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error(`Error adding category: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    if (isAuthenticated === false) {
      toast.error('You must be logged in to delete categories');
      return;
    }

    try {
      // Check if this is the only category
      if (categories.length <= 1) {
        toast.error('Cannot delete the last category. At least one category must exist.');
        return;
      }

      // Try to create the table if it doesn't exist using direct SQL
      const { success: tableSuccess, message: tableMessage } = await createCategoriesTableDirect();

      if (!tableSuccess) {
        console.error(`Table creation issue: ${tableMessage}`);
        toast.error('Could not access category table. Please try again later.');
        return;
      }

      // Delete the category using direct SQL
      const { success, message } = await deleteCategoryDirect(id);

      if (!success) {
        toast.error(`Error deleting category: ${message}`);
        return;
      }

      toast.success('Category deleted successfully');

      // Wait a moment before fetching categories to ensure the deleted one is removed
      setTimeout(() => {
        fetchCategories();
      }, 500);
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(`Error deleting category: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">Product Categories</h2>

      {isAuthenticated === false ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>You must be logged in to manage product categories.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex items-end space-x-4">
            <div className="flex-grow">
              <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="Enter category name"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !newCategoryName.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </>
              )}
            </button>
          </form>

          {/* Categories List */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Existing Categories</h3>

            {isLoading ? (
              <div className="flex justify-center items-center py-4">
                <Loader className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No categories found. Add your first category above.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <li key={category.id} className="py-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{category.name}</h4>
                      <p className="text-sm text-gray-500">Slug: {category.slug}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-900 p-2"
                      title="Delete category"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
