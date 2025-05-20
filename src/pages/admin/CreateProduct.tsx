import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Loader, Upload, Check, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadProductImage } from '../../lib/supabase-storage';
import { Size, Color } from '../../types';

interface ProductVariant {
  size: Size;
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
    priceAdjustment: 0,
    size: 'M' as Size
  }]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(['adults']);
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

  const sizesByAgeGroup = {
    adults: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    kids: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    toddlers: ['2T', '3T', '4T', '5T']
  };

  const formatThemeName = (theme: string) => {
    return theme
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  const formatColorName = (color: string) => {
    return color
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Get the age group from the first variant
      const ageGroup = variants[0]?.ageGroup || 'adults';

      // Create new product
      // First, check if can_personalize column exists
      try {
        // Try to create the column if it doesn't exist
        await supabase.rpc('execute_sql', {
          sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS can_personalize boolean DEFAULT false;'
        });
      } catch (e) {
        console.log('Could not add column via RPC, continuing with insert');
      }

      const productData: any = {
        title,
        description,
        price: parseFloat(price),
        themes: selectedThemes,
        age_group: ageGroup,
      };

      // Only add can_personalize if it's true to avoid schema errors
      if (canPersonalize) {
        productData.can_personalize = true;
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (productError) throw productError;

      // Handle image uploads
      const imagePromises = images
        .filter(img => img.file)
        .map(async (img) => {
          if (!img.file) return;
          const url = await uploadProductImage(img.file, product.id);
          return supabase
            .from('product_images')
            .insert({
              product_id: product.id,
              url,
              color: img.color,
              is_primary: img.isPrimary
            });
        });

      await Promise.all(imagePromises);

      // Get sizes based on age group
      const sizes = sizesByAgeGroup[ageGroup as keyof typeof sizesByAgeGroup];

      // Create variants
      const variantPromises = variants.flatMap(variant =>
        variant.colors.flatMap(color =>
          sizes.map(size => ({
            product_id: product.id,
            size,
            color,
            stock_quantity: 0,
            price_adjustment: variant.priceAdjustment
          }))
        )
      );

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantPromises);

      if (variantsError) throw variantsError;

      navigate('/admin/products');
    } catch (error: any) {
      console.error('Error creating product:', error);
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
      priceAdjustment: 0,
      size: 'M' as Size
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

      // Update all variants to use the same ageGroup
      setVariants(prev => prev.map(variant => ({
        ...variant,
        ageGroup: value
      })));
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