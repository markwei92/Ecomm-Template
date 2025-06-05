import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Loader, Upload, Check, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadProductImage } from '../../lib/supabase-storage';
import { Color, ProductCategory, ProductCategoryObject } from '../../types';
import { colorMap, formatColorName } from '../../utils/colorMap';
import { toast } from 'react-toastify';

interface ProductVariant {
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

export const CreateProduct: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [canPersonalize, setCanPersonalize] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([{
    ageGroup: 'adults',
    colors: [],
    priceAdjustment: 0
  }]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(['adults']);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<ProductCategory>('t-shirts');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<ProductCategoryObject[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState<string>('');
  const [isColorPanelOpen, setIsColorPanelOpen] = useState<number | null>(null);
  const colorPanelRef = useRef<HTMLDivElement>(null);

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
            setSelectedCategorySlug('t-shirts');
            return;
          }
          throw error;
        }

        console.log('Successfully fetched product categories:', data);

        // Log each category with its ID and validate UUID format
        data.forEach(category => {
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category.id);
          console.log(`Category: ${category.name}, ID: ${category.id}, Slug: ${category.slug}, Valid UUID: ${isValidUUID}`);

          if (!isValidUUID) {
            console.warn(`Category "${category.name}" has an invalid UUID: ${category.id}`);
          }
        });

        if (data && data.length > 0) {
          setCategories(data);
          // Set the first category as selected by default
          setSelectedCategorySlug(data[0].slug);
          setSelectedCategoryId(data[0].id);
          console.log('Selected category:', data[0].name, 'with ID:', data[0].id, 'and slug:', data[0].slug);
        } else {
          console.log('No categories found in database, using default');
          // If no categories found, add 't-shirts' as default
          // Use a proper UUID for the default category
          const defaultCategoryId = '00000000-0000-0000-0000-000000000001';
          const defaultCategory = {
            id: defaultCategoryId,
            name: 'T-Shirts',
            slug: 't-shirts',
            created_at: new Date().toISOString()
          };
          setCategories([defaultCategory]);
          setSelectedCategorySlug('t-shirts');
          setSelectedCategoryId(defaultCategoryId);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback to default categories if there's an error
        // Use a proper UUID for the default category
        const defaultCategoryId = '00000000-0000-0000-0000-000000000001';
        const defaultCategory = {
          id: defaultCategoryId,
          name: 'T-Shirts',
          slug: 't-shirts',
          created_at: new Date().toISOString()
        };
        setCategories([defaultCategory]);
        setSelectedCategorySlug('t-shirts');
        setSelectedCategoryId(defaultCategoryId);
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

  const formatThemeName = (theme: string) => {
    return theme
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate required fields
    if (!title.trim()) {
      setError('Product title is required');
      setIsSubmitting(false);
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      setError('Please enter a valid price');
      setIsSubmitting(false);
      return;
    }

    // Validate that at least one color is selected for each variant
    const hasEmptyColorVariants = variants.some(variant => variant.colors.length === 0);
    if (hasEmptyColorVariants) {
      setError('Please select at least one color for each variant');
      setIsSubmitting(false);
      return;
    }

    try {
      // Get the age group from the first variant
      const ageGroup = variants[0]?.ageGroup || 'adults';

      // Create new product
      // First, check if necessary columns exist
      try {
        // Try to create the columns if they don't exist
        await supabase.rpc('execute_sql', {
          sql: `
            ALTER TABLE products ADD COLUMN IF NOT EXISTS can_personalize boolean DEFAULT false;
          `
        });
        console.log('Successfully added can_personalize column to products table');
      } catch (e) {
        console.log('Could not add columns via RPC, continuing with insert:', e);
      }

      // Show a toast to indicate the product creation has started
      toast.info('Creating product...', { autoClose: false, toastId: 'creating-product' });

      // Create the base product data
      const productData: any = {
        title,
        description,
        price: parseFloat(price),
        themes: selectedThemes,
        age_group: ageGroup,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Check if the selected category ID is a valid UUID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedCategoryId);

      if (isValidUUID) {
        // If it's a valid UUID, use it for the category field
        productData.category = selectedCategoryId;
        console.log('Using category ID (valid UUID):', selectedCategoryId);
      } else {
        // If it's not a valid UUID, try to find the category with this slug
        const category = categories.find(cat => cat.slug === selectedCategorySlug);

        if (category && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category.id)) {
          // If we found the category and its ID is a valid UUID, use that
          productData.category = category.id;
          console.log('Using category ID from slug lookup:', category.id);
        } else {
          // As a last resort, use a default UUID
          const defaultUUID = '00000000-0000-0000-0000-000000000001';
          productData.category = defaultUUID;
          console.log('Using default UUID for category:', defaultUUID);

          // Show a warning
          toast.warning('Using default category ID because the selected category has an invalid ID');
        }
      }

      console.log('Creating product with category ID (UUID):', selectedCategoryId);

      // Only add can_personalize if it's true to avoid schema errors
      if (canPersonalize) {
        productData.can_personalize = true;
      }

      console.log('Creating product with data:', productData);

      // Try to insert the product - simplified approach
      let product;
      try {
        console.log('Attempting to insert product with data:', productData);

        const { data, error: productError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (productError) {
          console.error('Error inserting product:', productError);
          throw productError;
        }

        product = data;
        console.log('Product inserted successfully:', product);
      } catch (error) {
        console.error('Error in product insertion:', error);
        throw error;
      }

      if (!product || !product.id) {
        throw new Error('Failed to create product: No product ID returned');
      }

      console.log('Product created successfully:', product);

      // Update toast to show progress
      toast.update('creating-product', {
        render: 'Product created. Uploading images...',
        autoClose: false
      });

      // Handle image uploads
      const imagePromises = images
        .filter(img => img.file)
        .map(async (img) => {
          if (!img.file) return;
          try {
            const url = await uploadProductImage(img.file, product.id);
            console.log('Image uploaded:', url);
            return supabase
              .from('product_images')
              .insert({
                product_id: product.id,
                url,
                color: img.color,
                is_primary: img.isPrimary
              });
          } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
          }
        });

      await Promise.all(imagePromises);

      // Update toast to show progress
      toast.update('creating-product', {
        render: 'Images uploaded. Creating variants...',
        autoClose: false
      });

      // Create variants based on each variant's age group, generating all sizes for that age group
      const variantPromises = variants.flatMap(variant => {
        const sizes = sizesByAgeGroup[variant.ageGroup as keyof typeof sizesByAgeGroup];
        return variant.colors.flatMap(color =>
          sizes.map(size => ({
            product_id: product.id,
            size,
            color,
            stock_quantity: 0,
            price_adjustment: variant.priceAdjustment,
            is_enabled: true // Default to enabled for new variants
          }))
        );
      });

      console.log('Creating variants:', variantPromises.length);

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantPromises);

      if (variantsError) {
        console.error('Error creating variants:', variantsError);
        throw variantsError;
      }

      // Close the creating product toast
      toast.dismiss('creating-product');

      // Show success message
      toast.success('Product created successfully!');

      // Navigate to the product list page
      navigate('/admin/products');
    } catch (error: any) {
      console.error('Error creating product:', error);

      // Dismiss the creating product toast
      toast.dismiss('creating-product');

      // Show error toast
      toast.error(error.message || 'Failed to create product');

      // Set error message in the UI
      setError(error.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    files.forEach((file) => {
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

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddVariant = () => {
    setVariants(prev => [...prev, {
      ageGroup: 'adults',
      colors: [],
      priceAdjustment: 0
    }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants(prev => prev.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant,
    ));

    // Update selectedCollections when ageGroup changes
    if (field === 'ageGroup') {
      setSelectedCollections([value]);
      // We no longer update all variants to the same age group
      // This allows each variant to have its own age group
    }
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

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Product</h1>
        <button
          onClick={() => navigate('/admin/products')}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

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
                  value={selectedCategorySlug}
                  onChange={(e) => {
                    const selectedSlug = e.target.value as ProductCategory;
                    setSelectedCategorySlug(selectedSlug);
                    // Find the category ID that matches the selected slug
                    const selectedCategory = categories.find(cat => cat.slug === selectedSlug);
                    if (selectedCategory) {
                      setSelectedCategoryId(selectedCategory.id);
                      console.log('Selected category ID:', selectedCategory.id, 'for slug:', selectedSlug);

                      // Validate that the ID is a proper UUID
                      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedCategory.id);
                      console.log('Is valid UUID?', isValidUUID);

                      if (!isValidUUID) {
                        // Show a warning toast
                        toast.warning(`Category ID for "${selectedCategory.name}" is not a valid UUID. This may cause errors when creating products.`);
                      }
                    } else {
                      console.error('Could not find category with slug:', selectedSlug);
                      toast.error(`Could not find category with slug: ${selectedSlug}`);
                    }
                  }}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.slug}>
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
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                        setSelectedCollections([newAgeGroup]);
                        handleVariantChange(index, 'ageGroup', newAgeGroup);
                      }}
                      className="block w-32 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                    >
                      <option value="adults">Adults</option>
                      <option value="kids">Kids</option>
                      <option value="toddlers">Toddlers</option>
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sizes</label>
                    <div className="text-sm text-gray-600 py-2 px-3 bg-gray-50 border border-gray-300 rounded-md">
                      All {variant.ageGroup} sizes will be created
                    </div>
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};