import React, { useState, useEffect } from 'react';
import { Loader, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';

interface SimpleProductCategorySettingsProps {
  isAuthenticated: boolean | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export const SimpleProductCategorySettings: React.FC<SimpleProductCategorySettingsProps> = ({ isAuthenticated }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to ensure the table exists - we can't create it directly,
  // but we can check if it exists and handle accordingly
  const checkTableExists = async () => {
    try {
      // Try to query the table to see if it exists
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .limit(1);

      // If there's no error, the table exists
      if (!error) {
        console.log('Table exists and is accessible:', data);
        return true;
      }

      // If the error is about the table not existing, return false
      if (error.message.includes('does not exist') ||
        error.message.includes('relation') ||
        error.message.includes('column')) {
        console.log('Table does not exist:', error.message);
        return false;
      }

      // For other errors, log and return false
      console.error('Error checking if table exists:', error);
      return false;
    } catch (error) {
      console.error('Unexpected error checking table:', error);
      return false;
    }
  };

  // Function to fetch categories
  const fetchCategories = async () => {
    try {
      setIsLoading(true);

      // Force a direct fetch from the database without checking if the table exists first
      console.log('Attempting to fetch categories directly from database...');

      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);

        // If there's an error, check if the table exists
        const tableExists = await checkTableExists();

        if (!tableExists) {
          console.log('Categories table confirmed not to exist');
          // Show a default category in local state
          setCategories([{
            id: '1',
            name: 'T-Shirts',
            slug: 't-shirts',
            created_at: new Date().toISOString()
          }]);

          // Show a toast to inform the user
          toast.info('Using local categories. Database table not available.');
        } else {
          // Table exists but we still got an error
          toast.error(`Error fetching categories: ${error.message}`);
          setCategories([{
            id: '1',
            name: 'T-Shirts',
            slug: 't-shirts',
            created_at: new Date().toISOString()
          }]);
        }
        return;
      }

      // If we got here, we successfully fetched data from the database
      console.log('Successfully fetched categories from database:', data);

      if (data && data.length > 0) {
        setCategories(data);
        // Show a toast to confirm we're using database data
        toast.success('Categories loaded from database');
      } else {
        // If no categories found in the database, add the default one
        console.log('No categories found in database, adding default');

        // Try to insert the default category
        const { error: insertError } = await supabase
          .from('product_categories')
          .insert({
            name: 'T-Shirts',
            slug: 't-shirts'
          })
          .select();

        if (insertError) {
          console.error('Error inserting default category:', insertError);
          // Just use local state
          setCategories([{
            id: '1',
            name: 'T-Shirts',
            slug: 't-shirts',
            created_at: new Date().toISOString()
          }]);
        } else {
          // Fetch again after inserting
          const { data: refreshData } = await supabase
            .from('product_categories')
            .select('*')
            .order('created_at', { ascending: true });

          setCategories(refreshData || []);
        }
      }
    } catch (error: any) {
      console.error('Error in fetchCategories:', error);
      // Show error toast
      toast.error(`Unexpected error: ${error.message}`);

      // Show default category
      setCategories([{
        id: '1',
        name: 'T-Shirts',
        slug: 't-shirts',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Function to add a new category
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

      // Try to directly insert into the database without checking first
      console.log('Attempting to add category directly to database...');

      // Insert the new category using standard Supabase methods
      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          name: newCategoryName,
          slug: slug
        })
        .select();

      if (error) {
        console.error('Error adding category to database:', error);

        // Check if it's a duplicate key error
        if (error.message.includes('duplicate key')) {
          toast.error('A category with this name already exists');
          return;
        }

        // Check if the table exists
        const tableExists = await checkTableExists();

        if (!tableExists) {
          // If table doesn't exist, add to local state
          const newCategory = {
            id: Math.random().toString(36).substring(2, 15),
            name: newCategoryName,
            slug: slug,
            created_at: new Date().toISOString()
          };

          setCategories(prev => [...prev, newCategory]);
          toast.info('Category added to local state (database table not available)');
          setNewCategoryName('');
        } else {
          // Table exists but insert failed for another reason
          toast.error(`Error adding category: ${error.message}`);
        }
        return;
      }

      // If we got here, the insert was successful
      console.log('Category added successfully to database:', data);
      toast.success('Category added successfully to database');
      setNewCategoryName('');

      // Refresh the categories list
      fetchCategories();
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error(`Unexpected error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to delete a category
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

      // Try to directly delete from the database without checking first
      console.log('Attempting to delete category directly from database...');

      // Delete the category using standard Supabase methods
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting category from database:', error);

        // Check if the table exists
        const tableExists = await checkTableExists();

        if (!tableExists) {
          // If table doesn't exist, remove from local state
          setCategories(prev => prev.filter(cat => cat.id !== id));
          toast.info('Category removed from local state (database table not available)');
        } else {
          // Table exists but delete failed for another reason
          toast.error(`Error deleting category: ${error.message}`);
        }
        return;
      }

      // If we got here, the delete was successful
      console.log('Category deleted successfully from database');
      toast.success('Category deleted successfully from database');

      // Refresh the categories list
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(`Unexpected error: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">Product Categories (Simple Version)</h2>

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
