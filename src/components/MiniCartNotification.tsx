import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface MiniCartNotificationProps {
  isVisible: boolean;
  productTitle: string;
  onClose: () => void;
}

export const MiniCartNotification: React.FC<MiniCartNotificationProps> = ({
  isVisible,
  productTitle,
  onClose
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500); // Auto-close after 1.5 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-black text-white rounded-lg shadow-lg p-3 flex items-center max-w-xs">
        <div className="bg-green-500 rounded-full p-1 mr-3">
          <Check className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Added to cart!</p>
          <p className="text-xs text-gray-300 truncate">{productTitle}</p>
        </div>
      </div>
    </div>
  );
};
