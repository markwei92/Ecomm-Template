import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Plus, Search, Filter, ChevronDown } from 'lucide-react';
import { supabase, testConnection } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { PostgrestError } from '@supabase/supabase-js';

interface Product {
  id: string;
  title: string;
  price: number;
  stock_quantity: number;
  created_at: string;
  product_images: {
    url: string;
    is_primary: boolean;
  }[];
  product_variants: {
    size: string;
    color: string;
    stock_quantity: number;
  }[];
}

export const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    checkConnection();
    fetchProducts();
  }, [sortBy, sortOrder]);

  const checkConnection = async () => {
    const isConnected = await testConnection();
    if (!isConnected) {
      toast.error('Unable to connect to Supabase. Please check your connection settings.');
      return;
    }
  };

  const fetchProducts = async () => {
    try {
      // Only show loading state on initial load, not during refreshes
      if (products.length === 0) {
        setIsLoading(true);
      }

      // Check if Supabase client is properly initialized
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error('Authentication error: ' + sessionError.message);
      }

      console.log('Fetching products with sort:', sortBy, sortOrder);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            url,
            is_primary
          ),
          product_variants (
            size,
            color,
            stock_quantity
          )
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw productsError;
      }

      if (!productsData) {
        console.error('No product data received from database');
        throw new Error('No data received from database');
      }

      console.log('Fetched products:', productsData.length);

      // Check if we have new products that weren't in the previous state
      const newProductCount = productsData.filter(
        newProduct => !products.some(existingProduct => existingProduct.id === newProduct.id)
      ).length;

      if (newProductCount > 0 && products.length > 0) {
        toast.info(`${newProductCount} new product(s) added`);
      }

      setProducts(productsData as Product[]);
    } catch (error: unknown) {
      console.error('Error fetching products:', error);

      // Only show error toasts on initial load, not during background refreshes
      if (products.length === 0) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else if ((error as PostgrestError)?.message) {
          toast.error((error as PostgrestError).message);
        } else {
          toast.error('Failed to load products. Please try again later.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPrimaryImage = (product: Product) => {
    const primaryImage = product.product_images?.find(img => img.is_primary);
    return primaryImage?.url || 'https://via.placeholder.com/150';
  };

  // Helper function to determine age group from size
  const getAgeGroupFromSize = (size: string) => {
    if (['2T', '3T', '4T', '5T'].includes(size)) {
      return 'toddlers';
    } else if (size.includes('(Kids)')) {
      return 'kids';
    }
    return 'adults';
  };

  // Calculate logical variant count (grouped by age group, size, and price adjustment)
  const getLogicalVariantCount = (product: any) => {
    if (!product.product_variants || product.product_variants.length === 0) {
      return 0;
    }

    const variantGroups = new Map();

    product.product_variants.forEach((variant: any) => {
      const ageGroup = getAgeGroupFromSize(variant.size);
      const key = `${ageGroup}-${variant.size}-${variant.price_adjustment || 0}`;

      if (!variantGroups.has(key)) {
        variantGroups.set(key, {
          ageGroup,
          size: variant.size,
          colors: new Set(),
          priceAdjustment: variant.price_adjustment || 0
        });
      }

      // Add color to the set
      variantGroups.get(key).colors.add(variant.color);
    });

    return variantGroups.size;
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your product catalog, including variants and inventory
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/admin/products/new"
            className="flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              type="button"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="title-asc">Name A-Z</option>
            <option value="title-desc">Name Z-A</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Product
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      Price
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                      Added
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-sm text-gray-500 text-center">
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-sm text-gray-500 text-center">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                src={getPrimaryImage(product)}
                                alt={product.title}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">{product.title}</div>
                              <div className="text-gray-500">
                                {getLogicalVariantCount(product)} variants
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                          ${product.price.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                          {new Date(product.created_at).toLocaleDateString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};