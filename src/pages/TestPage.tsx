import React from 'react';

export const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Test Page</h1>
        <p className="text-gray-600">
          This is a simple test page to check if the application is working correctly.
        </p>
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Navigation Test</h2>
          <div className="space-y-2">
            <a href="/" className="block text-blue-600 hover:underline">Home</a>
            <a href="/products" className="block text-blue-600 hover:underline">Products</a>
            <a href="/admin" className="block text-blue-600 hover:underline">Admin</a>
          </div>
        </div>
      </div>
    </div>
  );
};
