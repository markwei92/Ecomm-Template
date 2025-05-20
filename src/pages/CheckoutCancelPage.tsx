import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export const CheckoutCancelPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center max-w-md mx-auto">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Checkout Cancelled
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your checkout process was cancelled. No payment has been processed.
          </p>
          <div className="mt-6">
            <Link
              to="/products"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Continue Shopping
            </Link>
          </div>
          <div className="mt-4">
            <Link
              to="/contact"
              className="text-sm font-medium text-black hover:text-gray-900"
            >
              Need help? Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};