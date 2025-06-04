import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Plus, Loader, Upload, Check, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadProductImage } from '../../lib/supabase-storage';
import { Color, ProductCategory, ProductCategoryObject } from '../../types';

interface ProductVariant {
  size: string;
  colors: Color[];
  ageGroup: string;
  priceAdjustment: number;
}

interface ProductImage {
  file?: File;
  url: string;
  color: Color;
  isPrimary: boolean;
}

export const EditProduct: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [canPersonalize, setCanPersonalize] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Changed to store UUID
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<ProductCategory>('t-shirts'); // Added to store slug for UI
  const [categories, setCategories] = useState<ProductCategoryObject[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState<string>('');
  const [isColorPanelOpen, setIsColorPanelOpen] = useState<number | null>(null);
  const colorPanelRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          file,
          url: e.target?.result as string,
          color: 'white',
          isPrimary: prev.length === 0
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = async (index: number) => {
    const image = images[index];

    try {
      if (!image.file) {
        // If it's an existing image, delete it from the database
        const { error } = await supabase
          .from('product_images')
          .delete()
          .eq('url', image.url);

        if (error) throw error;
      }

      setImages(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing image:', error);
      setError('Failed to remove image');
    }
  };

  const handleAddVariant = () => {
    setVariants(prev => [...prev, {
      size: 'M', // Default size
      ageGroup: 'adults', // Default age group
      colors: [],
      priceAdjustment: 0
    }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants(prev => prev.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  // Add click outside handler for color dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPanelRef.current && !colorPanelRef.current.contains(event.target as Node)) {
        setIsColorPanelOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const colors: Color[] = [
    'white', 'black', 'sport-grey', 'ice-grey', 'dark-heather-grey',
    'dark-chocolate', 'maroon', 'tropical-blue', 'sand', 'mint-green',
    'sage', 'military-green', 'forest-green', 'light-blue', 'navy',
    'light-pink', 'antique-heliconia', 'heather-orange', 'coral-silk'
  ];

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
        console.log('Fetching product categories from database...');

        // Fetch categories from the product_categories table
        const { data, error } = await supabase
          .from('product_categories')
          .select('id, name, slug, description, created_at, updated_at')
          .order('created_at');

        if (error) {
          console.error('Error fetching product categories:', error);
          // If the error is related to the table not existing, we'll handle it gracefully
          if (error.message.includes('does not exist') || error.message.includes('schema')) {
            console.log('Product categories table does not exist yet. Using default categories.');
            const defaultCategory = {
              id: '1',
              name: 'T-Shirts',
              slug: 't-shirts',
              created_at: new Date().toISOString()
            };
            setCategories([defaultCategory]);
            return;
          }
          throw error;
        }

        console.log('Successfully fetched product categories:', data);

        if (data && data.length > 0) {
          setCategories(data);
        } else {
          console.log('No categories found in database, using default');
          // If no categories found, add 't-shirts' as default
          const defaultCategory = {
            id: '1',
            name: 'T-Shirts',
            slug: 't-shirts',
            created_at: new Date().toISOString()
          };
          setCategories([defaultCategory]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback to default categories if there's an error
        const defaultCategory = {
          id: '1',
          name: 'T-Shirts',
          slug: 't-shirts',
          created_at: new Date().toISOString()
        };
        setCategories([defaultCategory]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const sizesByAgeGroup = {
    adults: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    kids: ['XS (Kids)', 'S (Kids)', 'M (Kids)', 'L (Kids)', 'XL (Kids)', '2XL (Kids)'],
    toddlers: ['2T', '3T', '4T', '5T']
  };

  const colorMap: Record<Color, string> = {
    'white': '#FFFFFF',
    'black': '#000000',
    'sport-grey': '#CACACA',
    'ice-grey': '#D7D6D3',
    'dark-heather-grey': '#3A3D42',
    'dark-chocolate': '#31221D',
    'maroon': '#642838',
    'tropical-blue': '#0097A9',
    'sand': '#DCD2BE',
    'mint-green': '#B1E0C0',
    'sage': '#A4B09E',
    'military-green': '#62664C',
    'forest-green': '#223B26',
    'light-blue': '#D6E6F7',
    'navy': '#1A2237',
    'light-pink': '#FEE0EB',
    'antique-heliconia': '#B92972',
    'heather-orange': '#FF8B4A',
    'coral-silk': '#E67376'
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

  useEffect(() => {
    // Only fetch the product after categories have been loaded
    if (categories.length > 0) {
      fetchProduct();
    }
  }, [id, categories]);

  const fetchProduct = async () => {
    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            id,
            url,
            color,
            is_primary
          ),
          product_variants (
            id,
            size,
            color,
            stock_quantity,
            price_adjustment
          )
        `)
        .eq('id', id)
        .single();

      if (productError) throw productError;

      if (!product) {
        setError('Product not found');
        return;
      }

      setTitle(product.title);
      setDescription(product.description || '');
      setPrice(product.price.toString());
      setSelectedThemes(product.themes || []);
      setCanPersonalize(product.can_personalize || false);

      // Store the category ID
      setSelectedCategory(product.category || '');

      // Find the category slug for the UI
      const categoryObj = categories.find(cat => cat.id === product.category);
      if (categoryObj) {
        setSelectedCategorySlug(categoryObj.slug);
      } else {
        // Default to t-shirts if category not found
        setSelectedCategorySlug('t-shirts');
      }

      setImages(product.product_images.map((img: any) => ({
        url: img.url,
        color: img.color,
        isPrimary: img.is_primary,
      })));

      // Group variants by size and price adjustment, collecting all colors for each size
      const variantGroups = new Map();

      product.product_variants.forEach((variant: any) => {
        // Determine age group from size
        let ageGroup = 'adults'; // default
        if (['2T', '3T', '4T', '5T'].includes(variant.size)) {
          ageGroup = 'toddlers';
        } else if (variant.size.includes('(Kids)')) {
          ageGroup = 'kids';
        }

        const key = `${variant.size}-${variant.price_adjustment || 0}`;

        if (!variantGroups.has(key)) {
          variantGroups.set(key, {
            size: variant.size,
            ageGroup,
            colors: [],
            priceAdjustment: variant.price_adjustment || 0
          });
        }

        // Add color if not already present
        const group = variantGroups.get(key);
        if (!group.colors.includes(variant.color)) {
          group.colors.push(variant.color);
        }
      });

      setVariants(Array.from(variantGroups.values()));

    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate that at least one color is selected for each variant
      const hasEmptyColorVariants = variants.some(variant => variant.colors.length === 0);
      if (hasEmptyColorVariants) {
        setError('Please select at least one color for each variant');
        setIsSubmitting(false);
        return;
      }

      // Validate that no duplicate sizes with same price adjustment exist
      const sizeKeys = new Set();
      for (const variant of variants) {
        const key = `${variant.size}-${variant.priceAdjustment}`;
        if (sizeKeys.has(key)) {
          setError(`Duplicate size found: ${variant.size} with same price adjustment. Please remove duplicates.`);
          setIsSubmitting(false);
          return;
        }
        sizeKeys.add(key);
      }

      // Update product details
      // First, check if can_personalize column exists
      try {
        // Try to create the column if it doesn't exist
        await supabase.rpc('execute_sql', {
          sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS can_personalize boolean DEFAULT false;'
        });
      } catch (e) {
        console.log('Could not add column via RPC, continuing with update');
      }

      // Determine the primary age group for the product
      // If all variants have the same age group, use that
      // Otherwise, use the most common age group or default to 'adults'
      const ageGroups = variants.map(v => v.ageGroup);
      const ageGroupCounts = ageGroups.reduce((acc, group) => {
        acc[group] = (acc[group] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const primaryAgeGroup = Object.entries(ageGroupCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'adults';

      const productData: any = {
        title,
        description,
        price: parseFloat(price),
        themes: selectedThemes,
        age_group: primaryAgeGroup,
        category: selectedCategory, // This is now the UUID
        updated_at: new Date().toISOString()
      };

      // Only add can_personalize if it's true to avoid schema errors
      if (canPersonalize) {
        productData.can_personalize = true;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Handle image uploads
      const imagePromises = images
        .filter(img => img.file)
        .map(async (img) => {
          if (!img.file) return;
          const url = await uploadProductImage(img.file, id!);
          return supabase
            .from('product_images')
            .insert({
              product_id: id,
              url,
              color: img.color,
              is_primary: img.isPrimary
            });
        });

      await Promise.all(imagePromises);

      // Update variants
      // Delete existing variants
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', id);

      // Create new variants based on age groups, generating all sizes for each age group
      const variantPromises = variants.flatMap(variant => {
        const sizes = sizesByAgeGroup[variant.ageGroup as keyof typeof sizesByAgeGroup];
        return variant.colors.flatMap(color =>
          sizes.map(size => ({
            product_id: id,
            size,
            color,
            stock_quantity: 0,
            price_adjustment: variant.priceAdjustment
          }))
        );
      });

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantPromises);

      if (variantsError) throw variantsError;

      navigate('/admin/products');
    } catch (error: any) {
      console.error('Error updating product:', error);
      setError(error.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <button
          onClick={() => navigate('/admin/products')}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="canPersonalize"
                checked={canPersonalize}
                onChange={(e) => setCanPersonalize(e.target.checked)}
                className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
              />
              <label htmlFor="canPersonalize" className="ml-2 block text-sm text-gray-900">
                Allow personalization
              </label>
              <div className="ml-2 text-sm text-gray-500">
                (Customers can add custom text to this product)
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Price</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-7 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              {isLoadingCategories ? (
                <div className="flex items-center space-x-2 h-10">
                  <Loader className="w-5 h-5 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Loading categories...</span>
                </div>
              ) : (
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const categoryId = e.target.value;
                    setSelectedCategory(categoryId);

                    // Also update the slug for UI consistency
                    const category = categories.find(cat => cat.id === categoryId);
                    if (category) {
                      setSelectedCategorySlug(category.slug);
                    }
                  }}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Themes</label>
              <div className="border border-gray-200 rounded-lg p-4 max-h-[240px] overflow-y-auto">
                {isLoadingThemes ? (
                  <div className="flex justify-center items-center py-4">
                    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {themes.map(theme => (
                      <label key={theme} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedThemes.includes(theme)}
                          onChange={() => {
                            setSelectedThemes(prev =>
                              prev.includes(theme)
                                ? prev.filter(t => t !== theme)
                                : [...prev, theme]
                            );
                          }}
                          className="h-4 w-4 text-black focus:ring-black rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">
                          {formatThemeName(theme)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Variants</label>
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Age Group</label>
                    <select
                      value={variant.ageGroup}
                      onChange={(e) => {
                        const newAgeGroup = e.target.value;
                        handleVariantChange(index, 'ageGroup', newAgeGroup);

                        // Auto-update size to first available size for the new age group
                        const newSizes = sizesByAgeGroup[newAgeGroup as keyof typeof sizesByAgeGroup];
                        if (newSizes && newSizes.length > 0) {
                          handleVariantChange(index, 'size', newSizes[0]);
                        }
                      }}
                      className="block w-32 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                    >
                      <option value="adults">Adults</option>
                      <option value="kids">Kids</option>
                      <option value="toddlers">Toddlers</option>
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
                    <select
                      value={variant.size}
                      onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                      className="block w-28 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                    >
                      {sizesByAgeGroup[variant.ageGroup as keyof typeof sizesByAgeGroup].map(size => (
                        <option key={size} value={size}>
                          {size.replace(' (Kids)', '')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Colors</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsColorPanelOpen(isColorPanelOpen === index ? null : index)}
                        className="relative w-48 bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
                      >
                        <span className="flex items-center space-x-2">
                          {variant.colors.length === 0 ? (
                            <span className="text-gray-500">Select colors</span>
                          ) : (
                            <span className="text-gray-900">{variant.colors.length} selected</span>
                          )}
                        </span>
                        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </span>
                      </button>

                      {isColorPanelOpen === index && (
                        <div
                          ref={colorPanelRef}
                          className="absolute z-10 mt-1 w-48 bg-white shadow-lg max-h-60 rounded-md py-1 ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {colors.map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                const newColors = variant.colors.includes(color)
                                  ? variant.colors.filter(c => c !== color)
                                  : [...variant.colors, color];
                                handleVariantChange(index, 'colors', newColors);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                            >
                              <div
                                className={`
                                  w-4 h-4 rounded-full flex-shrink-0 border
                                  ${variant.colors.includes(color) ? 'border-2 border-indigo-500' : 'border-gray-300'}
                                `}
                                style={{ backgroundColor: colorMap[color] }}
                              />
                              <span className={`text-sm ${variant.colors.includes(color) ? 'font-medium' : ''}`}>
                                {formatColorName(color)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Price Adj.</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        value={variant.priceAdjustment}
                        onChange={(e) => handleVariantChange(index, 'priceAdjustment', parseFloat(e.target.value))}
                        className="pl-7 block w-24 border border-gray-300 rounded-md shadow-sm py-2 pr-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newVariant = { ...variants[index] };
                      setVariants(prev => [...prev, newVariant]);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="Duplicate variant"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                    title="Remove variant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddVariant}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Variant
              </button>
            </div>
          </div>

          <div className="pt-5">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};