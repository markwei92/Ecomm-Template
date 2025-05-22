import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Filters } from '../components/Filters';
import { ProductGrid } from '../components/ProductGrid';
import { FilterState, Product, AgeGroup, ProductCategory } from '../types';
import { PanelLeftClose, PanelLeftOpen, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const ProductsPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // Parse age group from URL or use all age groups by default
  const getInitialAgeGroups = (): AgeGroup[] => {
    const ageGroupParam = queryParams.get('ageGroup');
    if (ageGroupParam && (ageGroupParam === 'adults' || ageGroupParam === 'kids' || ageGroupParam === 'toddlers')) {
      // If ageGroup parameter exists, use only that age group
      return [ageGroupParam];
    }
    // Otherwise include all age groups by default
    return ['adults', 'kids', 'toddlers'];
  };

  // Parse categories from URL or use 't-shirts' by default
  const getInitialCategories = (): ProductCategory[] => {
    const categoryParam = queryParams.get('category');
    if (categoryParam) {
      return [categoryParam];
    }

    // Default to 't-shirts' if no category is specified
    return ['t-shirts'];
  };

  const initialFilters: FilterState = {
    styles: [],
    theme: queryParams.get('theme') || '',
    color: queryParams.get('color') || '',
    ageGroups: getInitialAgeGroups(),
    categories: getInitialCategories(),
    searchQuery: queryParams.get('search') || '',
    sortBy: queryParams.get('sortBy') || '',
  };

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create a ref to track initial render
  const isInitialRender = useRef(true);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          product_images (
            url,
            color,
            is_primary
          ),
          product_variants (
            size,
            color,
            stock_quantity,
            price_adjustment
          )
        `);

      // Apply filters at database level where possible
      if (filters.theme) {
        query = query.contains('themes', [filters.theme]);
      }

      // Always filter by the selected age groups
      query = query.in('age_group', filters.ageGroups);

      // Filter by category if specific categories are selected (not 'all')
      if (filters.categories.length > 0 && !filters.categories.includes('all')) {
        // For now, let's skip the category filtering at the database level
        // and handle it in the client-side filtering in ProductGrid.tsx
        console.log('Filtering by categories in client:', filters.categories);
      }

      if (filters.searchQuery) {
        query = query.ilike('title', `%${filters.searchQuery}%`);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'price-asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price-desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our Product type
      const transformedProducts: Product[] = data.map(product => {
        // Special case for the mug product
        let category = product.category;
        if (product.id === '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c') {
          console.log('Found mug product with category:', category);
          // If this is the mug product, force its category to be 'mugs'
          category = 'mugs';
        }

        return {
          id: product.id,
          title: product.title,
          description: product.description || '',
          price: product.price,
          images: product.product_images.map((img: any) => ({
            color: img.color,
            url: img.url
          })),
          styles: [],
          themes: product.themes || [],
          colors: Array.from(new Set(product.product_variants.map((v: any) => v.color))),
          ageGroup: product.age_group,
          sizes: Array.from(new Set(product.product_variants.map((v: any) => v.size))),
          createdAt: product.created_at,
          canPersonalize: product.can_personalize,
          category: category // Use the potentially modified category
        };
      });

      console.log('Transformed products with categories:', transformedProducts.map(p => ({ id: p.id, title: p.title, category: p.category })));

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // This effect only runs on initial load to set filters from URL parameters
  useEffect(() => {
    // Get all query parameters from the URL
    const searchQuery = queryParams.get('search') || '';
    const themeParam = queryParams.get('theme') || '';
    const ageGroupParam = queryParams.get('ageGroup');
    const categoryParam = queryParams.get('category');

    // Determine age groups based on URL parameter
    const ageGroups: AgeGroup[] = ageGroupParam &&
      (ageGroupParam === 'adults' || ageGroupParam === 'kids' || ageGroupParam === 'toddlers')
      ? [ageGroupParam]
      : ['adults', 'kids', 'toddlers'];

    // Determine categories based on URL parameter
    const categories: ProductCategory[] = categoryParam
      ? [categoryParam]
      : ['all'];

    // Only update filters on initial load
    if (filters === initialFilters) {
      setFilters(prev => ({
        ...prev,
        searchQuery,
        theme: themeParam,
        ageGroups,
        categories
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This effect updates the URL when filters change
  useEffect(() => {
    // Skip the first render to avoid conflicts with the initial URL parsing
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    const params = new URLSearchParams();

    if (filters.theme) {
      params.set('theme', filters.theme);
    }

    if (filters.color) {
      params.set('color', filters.color);
    }

    // Include ageGroup in URL only when a single age group is selected
    if (filters.ageGroups.length === 1) {
      params.set('ageGroup', filters.ageGroups[0]);
    }
    // When no age groups are selected, we still want to show that in the URL
    else if (filters.ageGroups.length === 0) {
      params.set('ageGroup', 'none');
    }
    // When all age groups are selected, we don't need to include it in the URL

    // Include category in URL only when a specific category is selected
    if (filters.categories.length === 1 && filters.categories[0] !== 'all') {
      params.set('category', filters.categories[0]);
    }
    // When no categories are selected, we still want to show that in the URL
    else if (filters.categories.length === 0) {
      params.set('category', 'none');
    }
    // When 'all' category is selected, we don't need to include it in the URL

    if (filters.searchQuery) {
      params.set('search', filters.searchQuery);
    }

    if (filters.sortBy) {
      params.set('sortBy', filters.sortBy);
    }

    // Only update if the URL actually changed to avoid unnecessary rerenders
    const queryString = params.toString();
    const newUrl = queryString ? `${location.pathname}?${queryString}` : location.pathname;

    // Use replaceState to avoid adding to browser history
    window.history.replaceState({}, '', newUrl);
  }, [filters, location.pathname]);

  const handleSortChange = (value: string) => {
    setFilters(prev => ({ ...prev, sortBy: value }));
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 mt-32">
        {filters.searchQuery && (
          <div className="mb-6">
            <h2 className="text-xl font-medium text-gray-900">
              Search results for: <span className="font-bold">"{filters.searchQuery}"</span>
            </h2>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8 relative">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden fixed bottom-4 right-4 z-50 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors duration-200"
            aria-label={isSidebarOpen ? "Close filters" : "Open filters"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-6 w-6" />
            ) : (
              <PanelLeftOpen className="h-6 w-6" />
            )}
          </button>

          {/* Sidebar */}
          <aside
            className={`
              transform transition-all duration-300 ease-in-out
              fixed md:relative
              inset-y-0 left-0 z-40 md:z-0
              w-64
              bg-white md:bg-transparent
              shadow-lg md:shadow-none
              ${isSidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:w-0'}
              h-screen md:h-auto
              overflow-y-auto
              md:overflow-hidden
            `}
          >
            <div className={`
              sticky top-8 p-4 md:p-0
              transition-opacity duration-300
              ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:invisible'}
            `}>
              <div className="flex justify-between items-center md:hidden mb-4">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <PanelLeftClose className="h-5 w-5" />
                </button>
              </div>
              <Filters filters={filters} onFilterChange={setFilters} />
            </div>
          </aside>

          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <div className={`
            flex-1
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'md:ml-0' : 'md:ml-0'}
          `}>
            {/* Desktop Filter Toggle */}
            <div className="hidden md:flex items-center justify-between mb-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-1.5 text-gray-600 hover:text-black h-9 px-3 rounded-md hover:bg-gray-50"
              >
                {isSidebarOpen ? (
                  <>
                    <PanelLeftClose className="h-4 w-4" />
                    <span className="text-sm font-medium">Hide Filters</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="h-4 w-4" />
                    <span className="text-sm font-medium">Show Filters</span>
                  </>
                )}
              </button>
            </div>

            <h1 className="text-3xl font-bold text-black mb-4">T-Shirts Collection</h1>

            {/* Sort and Description */}
            <div className="flex items-center justify-between mb-8">
              <p className="text-gray-600">Find your perfect style from our curated collection</p>
              <div className="relative inline-block">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="appearance-none h-9 pl-3 pr-8 rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Sort by: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="newest">Newest</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : (
              <ProductGrid products={products} filters={filters} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};