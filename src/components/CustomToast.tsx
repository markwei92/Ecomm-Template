import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Loader } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export const CustomToast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (type !== 'loading' && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Allow time for fade-out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose, type]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'loading':
        return <Loader className="w-5 h-5 text-gray-500 animate-spin" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'loading':
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg border ${getBgColor()} transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } z-50`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  children: React.ReactNode;
}

export const CustomToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
  return <div className="fixed bottom-4 right-4 space-y-2 z-50">{children}</div>;
};

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  showLoading: (message: string) => string;
  updateLoading: (id: string, message: string, type: ToastType) => void;
  closeToast: (id: string) => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<ToastContainerProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  };

  const showLoading = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type: 'loading', duration: 0 }]);
    return id;
  };

  const updateLoading = (id: string, message: string, type: ToastType) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, message, type, duration: 5000 } : toast
      )
    );
  };

  const closeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, showLoading, updateLoading, closeToast }}>
      {children}
      <CustomToastContainer>
        {toasts.map((toast) => (
          <CustomToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => closeToast(toast.id)}
          />
        ))}
      </CustomToastContainer>
    </ToastContext.Provider>
  );
};
