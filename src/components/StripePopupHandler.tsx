import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, ExternalLink } from 'lucide-react';

interface StripePopupHandlerProps {
  checkoutUrl: string;
  onCancel: () => void;
}

export const StripePopupHandler: React.FC<StripePopupHandlerProps> = ({ 
  checkoutUrl, 
  onCancel 
}) => {
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [checkStatus, setCheckStatus] = useState<'checking' | 'completed' | 'cancelled'>('checking');
  const navigate = useNavigate();

  // Open the popup window when the component mounts
  useEffect(() => {
    // Function to open the popup
    const openPopup = () => {
      // Calculate popup dimensions
      const width = Math.min(1200, window.screen.width * 0.8);
      const height = Math.min(800, window.screen.height * 0.8);
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      // Open the popup
      const popup = window.open(
        checkoutUrl,
        'StripeCheckout',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );

      if (popup) {
        setPopupWindow(popup);
        
        // Focus the popup
        popup.focus();
      } else {
        // Popup was blocked
        console.error('Popup window was blocked. Please allow popups for this site.');
      }
    };

    openPopup();

    // Cleanup function to close the popup when the component unmounts
    return () => {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
    };
  }, [checkoutUrl]);

  // Check if the popup is still open and poll for completion
  useEffect(() => {
    if (!popupWindow) return;

    // Function to check if the payment is complete
    const checkPaymentStatus = async () => {
      try {
        // Get the session ID from storage
        const sessionId = window.sessionStorage.getItem('stripe_session_id');
        
        if (!sessionId || sessionId === 'popup') {
          return; // No valid session ID to check
        }

        // Check if the popup is closed
        if (popupWindow.closed) {
          // If the popup is closed, we'll check if the payment was successful
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/stripe_orders?checkout_session_id=eq.${sessionId}&select=id,status`, {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();
          
          if (data && data.length > 0 && data[0].status === 'completed') {
            // Payment was successful
            setCheckStatus('completed');
            navigate(`/checkout/success?session_id=${sessionId}`);
          } else {
            // Payment was not successful or not found
            setCheckStatus('cancelled');
            onCancel();
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    // Poll for payment status every 2 seconds
    const intervalId = setInterval(checkPaymentStatus, 2000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [popupWindow, navigate, onCancel]);

  // Function to reopen the popup if it was closed
  const handleReopenPopup = () => {
    if (popupWindow && popupWindow.closed) {
      window.open(checkoutUrl, 'StripeCheckout');
    }
  };

  return (
    <div className="text-center p-8">
      <div className="mb-6">
        <Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
        <p className="mt-4 text-lg text-gray-700">
          Stripe Checkout has opened in a new window
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Please complete your payment in the new window. This page will update automatically when your payment is complete.
        </p>
      </div>
      
      <div className="mt-8">
        <button
          onClick={handleReopenPopup}
          className="flex items-center justify-center mx-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Reopen Payment Window
        </button>
      </div>
      
      <div className="mt-4">
        <button
          onClick={onCancel}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Cancel and return to cart
        </button>
      </div>
    </div>
  );
};
