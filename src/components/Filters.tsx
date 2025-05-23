import React, { useState, useEffect } from 'react';
import { FilterState, Theme, AgeGroup, ProductCategory } from '../types';
import { X, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-gray-200 py-4 last:border-b-0">
      <button
        className="flex w-full items-center justify-between text-lg font-medium text-gray-900 hover:text-gray-600 transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {title}
        <div className="transform transition-transform duration-300">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </button>
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="pt-4 space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange }) => {
  const [themes, setThemes] = useState<string[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);

  // Fetch themes from database
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setIsLoadingThemes(true);

        // Fetch themes from the themes table
        const { data, error } = await supabase
          .from('themes')
          .select('slug')
          .order('name');

        if (error) throw error;

        // Extract theme slugs
        const themesList = data.map(theme => theme.slug);
        setThemes(themesList);
      } catch (error) {
        console.error('Error fetching themes:', error);
        // Fallback to default themes if there's an error
        setThemes([
          'christmas',
          'common-phrases',
          'daily-life',
          'graphic-only',
          'hobby',
          'memes',
          'others',
          'personality',
          'politics',
          'sports',
          'yoda'
        ]);
      } finally {
        setIsLoadingThemes(false);
      }
    };

    fetchThemes();
  }, []);

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);

        // Fetch categories from the product_categories table
        console.log('Fetching product categories from database...');
        const { data, error } = await supabase
          .from('product_categories')
          .select('id, name, slug')
          .order('created_at');

        console.log('Product categories fetched:', data);
        console.log('🔍 CATEGORIES DEBUG - Raw data from database:', JSON.stringify(data, null, 2));

        if (error) {
          // If the error is related to the table not existing, we'll handle it gracefully
          if (error.message.includes('does not exist') || error.message.includes('schema')) {
            console.log('Product categories table does not exist yet. Using default categories.');
            setCategories(['all', 't-shirts']);
            return;
          }
          throw error;
        }

        // Always include 'all' as the first option
        const categoryList: ProductCategory[] = ['all'];

        // Add categories from database
        if (data && data.length > 0) {
          data.forEach(category => {
            categoryList.push(category.slug as ProductCategory);
          });
        } else {
          // If no categories found, add 't-shirts' as default
          categoryList.push('t-shirts');
        }

        console.log('🔍 CATEGORIES DEBUG - Final category list being set:', categoryList);
        setCategories(categoryList);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback to default categories if there's an error
        setCategories(['all', 't-shirts']);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const ageGroups: AgeGroup[] = ['adults', 'kids', 'toddlers'];
  const [categories, setCategories] = useState<ProductCategory[]>(['all', 't-shirts']);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const handleChange = (key: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleThemeChange = (theme: string) => {
    // If clicking on the currently selected theme, deselect it (set to empty string)
    // Otherwise, select the new theme
    handleChange('theme', theme === filters.theme ? '' : theme);
  };

  const handleAgeGroupToggle = (ageGroup: AgeGroup) => {
    const newAgeGroups = filters.ageGroups.includes(ageGroup)
      ? filters.ageGroups.filter(ag => ag !== ageGroup)
      : [...filters.ageGroups, ageGroup];
    handleChange('ageGroups', newAgeGroups);
  };

  const handleCategoryToggle = (category: ProductCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(cat => cat !== category)
      : [...filters.categories, category];

    console.log('Category toggled:', category, 'New categories:', newCategories);

    // Special handling for 'all' category
    if (category === 'all' && newCategories.includes('all')) {
      // If 'all' is selected, deselect other categories
      handleChange('categories', ['all']);
    } else if (newCategories.includes('all') && newCategories.length > 1) {
      // If 'all' is already selected and another category is selected, deselect 'all'
      handleChange('categories', newCategories.filter(cat => cat !== 'all'));
    } else {
      // Normal case
      handleChange('categories', newCategories);
    }
  };

  const clearFilters = () => {
    onFilterChange({
      styles: [],
      theme: '',
      color: '',
      ageGroups: ['adults', 'kids', 'toddlers'], // Include all age groups by default
      categories: ['t-shirts'], // Set T-Shirts as the default category
      searchQuery: '',
      sortBy: '',
    });
  };

  const formatThemeName = (theme: string) => {
    return theme
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatColorName = (color: string) => {
    return color
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
        <button
          onClick={clearFilters}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
        >
          <X className="h-4 w-4 mr-1" />
          Clear All
        </button>
      </div>

      <FilterSection title="Themes">
        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 w-full">
          {isLoadingThemes ? (
            <div className="flex justify-center items-center py-4">
              <Loader className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value=""
                  checked={filters.theme === ''}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-2 group-hover:text-gray-900 transition-colors duration-200">
                  All Themes
                </span>
              </label>
              {themes.map(theme => (
                <label key={theme} className="flex items-center group cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={theme}
                    checked={filters.theme === theme}
                    onChange={(e) => handleThemeChange(e.target.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-2 group-hover:text-gray-900 transition-colors duration-200">
                    {formatThemeName(theme)}
                  </span>
                </label>
              ))}
            </>
          )}
        </div>
      </FilterSection>

      <FilterSection title="Age Group">
        <div className="grid grid-cols-1 gap-2">
          {ageGroups.map(group => (
            <label key={group} className="flex items-center group cursor-pointer">
              <input
                type="checkbox"
                checked={filters.ageGroups.includes(group)}
                onChange={() => handleAgeGroupToggle(group)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded transition-colors duration-200"
              />
              <span className="ml-2 capitalize group-hover:text-gray-900 transition-colors duration-200">
                {group}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Category">
        <div className="grid grid-cols-1 gap-2">
          {isLoadingCategories ? (
            <div className="flex justify-center items-center py-4">
              <Loader className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : (
            categories.map(category => (
              <label key={category} className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded transition-colors duration-200"
                />
                <span className="ml-2 capitalize group-hover:text-gray-900 transition-colors duration-200">
                  {category === 'all' ? 'All Products' : category === 't-shirts' ? 'T-Shirts' : category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </label>
            ))
          )}
        </div>
      </FilterSection>

    </div>
  );
};