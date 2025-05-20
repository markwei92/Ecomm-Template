import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, ShoppingBag } from 'lucide-react';

export const CheckoutRedirectHandler: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're returning from Stripe checkout
    const searchParams = new URLSearchParams(window.location.search);
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      // We're returning from Stripe checkout
      // Redirect to the success page
      navigate(`/checkout/success?session_id=${sessionId}`);
    } else {
      // We're not returning from Stripe checkout
      // Check if we have a return URL in session storage
      const returnUrl = window.sessionStorage.getItem('checkout_return_url');
      if (returnUrl) {
        // Clear the session storage
        window.sessionStorage.removeItem('checkout_return_url');
        window.sessionStorage.removeItem('checkout_session_id');
        window.sessionStorage.removeItem('checkout_items');
        
        // Redirect to the return URL
        window.location.href = returnUrl;
      } else {
        // No return URL, redirect to the home page
        navigate('/');
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-600 text-lg">
              Returning from checkout...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
