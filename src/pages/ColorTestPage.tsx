import React from 'react';
import { colorMap, formatColorName, getAllColors } from '../utils/colorMap';

export const ColorTestPage: React.FC = () => {
  const colors = getAllColors();

  return (
    <div className="min-h-screen pt-16 bg-white">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8">Color Test Page</h1>
        <p className="text-gray-600 mb-8">
          This page displays all {colors.length} available colors to verify they're rendering correctly.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {colors.map((color) => (
            <div key={color} className="text-center">
              <div
                className="w-20 h-20 rounded-full border-2 border-gray-300 mx-auto mb-2 shadow-md"
                style={{ backgroundColor: colorMap[color] }}
                title={`${formatColorName(color)} - ${colorMap[color]}`}
              />
              <div className="text-sm font-medium text-gray-900">
                {formatColorName(color)}
              </div>
              <div className="text-xs text-gray-500 font-mono">
                {color}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {colorMap[color]}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Color Mapping Test</h2>
          <p className="text-gray-600 mb-4">
            Testing specific colors that were reported as issues:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-4">
              <div
                className="w-12 h-12 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: colorMap['tropical-blue'] }}
              />
              <div>
                <div className="font-medium">Tropical Blue</div>
                <div className="text-sm text-gray-500">Should be teal/cyan color</div>
                <div className="text-xs font-mono">{colorMap['tropical-blue']}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div
                className="w-12 h-12 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: colorMap['white'] }}
              />
              <div>
                <div className="font-medium">White</div>
                <div className="text-sm text-gray-500">Should be pure white</div>
                <div className="text-xs font-mono">{colorMap['white']}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a 
            href="/products" 
            className="inline-block px-6 py-3 bg-black text-white rounded-md hover:bg-gray-900 transition-colors"
          >
            Back to Products
          </a>
        </div>
      </div>
    </div>
  );
};
