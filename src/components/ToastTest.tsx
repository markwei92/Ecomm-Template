import React from 'react';
import { toast } from 'react-toastify';

export const ToastTest: React.FC = () => {
  const showSuccessToast = () => {
    console.log('Showing success toast');
    toast.success('Success toast test');
  };

  const showErrorToast = () => {
    console.log('Showing error toast');
    toast.error('Error toast test');
  };

  const showInfoToast = () => {
    console.log('Showing info toast');
    toast.info('Info toast test');
  };

  const showWarningToast = () => {
    console.log('Showing warning toast');
    toast.warn('Warning toast test');
  };

  const showLoadingToast = () => {
    console.log('Showing loading toast');
    const toastId = toast.loading('Loading toast test');
    
    // Update the toast after 3 seconds
    setTimeout(() => {
      console.log('Updating loading toast');
      toast.update(toastId, {
        render: 'Loading complete!',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });
    }, 3000);
  };

  return (
    <div className="fixed top-20 right-5 bg-white p-4 rounded-lg shadow-lg z-50">
      <h2 className="text-lg font-bold mb-4">Toast Test Panel</h2>
      <div className="space-y-2">
        <button
          onClick={showSuccessToast}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Show Success Toast
        </button>
        <button
          onClick={showErrorToast}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Show Error Toast
        </button>
        <button
          onClick={showInfoToast}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Show Info Toast
        </button>
        <button
          onClick={showWarningToast}
          className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Show Warning Toast
        </button>
        <button
          onClick={showLoadingToast}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Show Loading Toast
        </button>
      </div>
    </div>
  );
};
