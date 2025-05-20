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

    // Check age groups
    if (filters.ageGroups.length > 0 && !filters.ageGroups.includes(product.ageGroup)) {
      return false;
    }

    // Check colors
    if (filters.color && !product.colors.includes(filters.color)) {
      return false;
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