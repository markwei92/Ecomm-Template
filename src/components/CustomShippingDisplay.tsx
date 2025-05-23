import React from 'react';

interface CustomShippingDisplayProps {
  shippingCost: number;
}

export const CustomShippingDisplay: React.FC<CustomShippingDisplayProps> = ({ shippingCost }) => {
  return (
    <div className="mb-4 border-b border-gray-200 pb-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Shipping</span>
        <span className="text-sm font-medium text-gray-900">${shippingCost.toFixed(2)}</span>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        <span className="italic">Note: The shipping cost will be applied correctly during payment processing.</span>
      </div>
    </div>
  );
};
