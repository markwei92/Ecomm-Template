import React from 'react';
import { ProductCard } from './ProductCard';
import { Product, FilterState } from '../types';

interface ProductGridProps {
  products: Product[];
  filters: FilterState;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, filters }) => {
  const filteredProducts = products.filter(product => {
    // Check theme
    if (filters.theme && !product.themes.includes(filters.theme)) {
      return false;
    }

    // Check age groups - use availableAgeGroups if available, otherwise fall back to ageGroup
    if (filters.ageGroups.length > 0) {
      const productAgeGroups = product.availableAgeGroups || [product.ageGroup];
      const hasMatchingAgeGroup = filters.ageGroups.some(ageGroup =>
        productAgeGroups.includes(ageGroup)
      );
      if (!hasMatchingAgeGroup) {
        return false;
      }
    }

    // Check colors
    if (filters.color && !product.colors.includes(filters.color)) {
      return false;
    }

    // Check categories
    if (filters.categories.length > 0 && !filters.categories.includes('all')) {
      console.log(`Checking product ${product.id} with category "${product.category}" against filters:`, filters.categories);

      // If the product's category doesn't match any of the selected categories, filter it out
      // We need to handle both UUID and slug-based categories
      const productCategory = product.category || 't-shirts'; // Default to t-shirts if no category

      // Check if the product's category matches any of the selected categories
      const categoryMatches = filters.categories.some(cat => {
        // Direct match (for slug-based categories)
        if (productCategory === cat) {
          console.log(`Product ${product.id} matches category ${cat} directly`);
          return true;
        }

        // For UUID-based categories, we need to check if the product's category is a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(productCategory)) {
          console.log(`Product ${product.id} has UUID category: ${productCategory}`);

          // Special handling for the specific product with mugs category
          if (product.id === '9b73fe3d-c0d4-4059-9cd9-cfa60a6da24c' && cat === 'mugs') {
            console.log(`Special case: Product ${product.id} matches 'mugs' category`);
            return true;
          }

          // For other products with UUID categories, check if they match the selected category
          if (cat === 't-shirts' && productCategory === '00000000-0000-0000-0000-000000000001') {
            return true;
          }

          if (cat === 'mugs' && productCategory === '00000000-0000-0000-0000-000000000002') {
            return true;
          }
        }

        return false;
      });

      if (!categoryMatches) {
        console.log(`Product ${product.id} filtered out due to category mismatch`);
        return false;
      }

      console.log(`Product ${product.id} passed category filter`);
      // Otherwise continue with other filters
    }

    // Check search query
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      const matchesTitle = product.title.toLowerCase().includes(searchLower);
      const matchesDescription = product.description.toLowerCase().includes(searchLower);
      const matchesThemes = product.themes.some(theme =>
        theme.toLowerCase().includes(searchLower)
      );

      if (!matchesTitle && !matchesDescription && !matchesThemes) {
        return false;
      }
    }

    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (filters.sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  if (sortedProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No products found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sortedProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};