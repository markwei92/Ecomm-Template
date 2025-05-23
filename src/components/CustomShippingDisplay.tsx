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
    </div>
  );
};
