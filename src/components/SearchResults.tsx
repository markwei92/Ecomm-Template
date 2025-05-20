import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';

interface SearchResultsProps {
  results: Product[];
  searchQuery: string;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchQuery,
  onClose,
  onSelectProduct
}) => {
  if (searchQuery.length === 0) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-900">
            {results.length === 0
              ? 'No results found'
              : `Search results (${results.length})`
            }
          </h3>
          {/* Removed duplicate close button */}
        </div>

        {results.length === 0 ? (
          <p className="text-sm text-gray-500">
            No products found for "{searchQuery}"
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {results.map((product) => (
              <li key={product.id} className="py-3">
                <Link
                  to={`/products?search=${searchQuery}`}
                  className="flex items-center hover:bg-gray-50 p-2 rounded-md"
                  onClick={() => onSelectProduct(product)}
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <img
                      src={product.images[0]?.url || ''}
                      alt={product.title}
                      className="h-full w-full object-cover object-center"
                      onError={(e) => {
                        // If image fails to load, show default
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = "https://raw.githubusercontent.com/stackblitz/stackblitz-icons/main/public/emoji-smile-sunglasses.png";
                      }}
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-900">{product.title}</p>
                    <p className="text-sm text-gray-500">${product.price.toFixed(2)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {results.length > 0 && (
          <Link
            to={`/products?search=${searchQuery}`}
            className="block text-center mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            onClick={onClose}
          >
            View all results
          </Link>
        )}
      </div>
    </div>
  );
};