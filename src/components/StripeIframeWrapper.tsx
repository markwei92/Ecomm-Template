import React, { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StripeIframeWrapperProps {
  checkoutUrl: string;
}

export const StripeIframeWrapper: React.FC<StripeIframeWrapperProps> = ({ checkoutUrl }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from Stripe
      if (event.origin !== 'https://checkout.stripe.com') return;

      try {
        const data = JSON.parse(event.data);
        
        // Handle checkout completion
        if (data.type === 'checkout-complete') {
          const sessionId = new URL(checkoutUrl).searchParams.get('session_id');
          navigate(`/checkout/success?session_id=${sessionId}`);
        }
        
        // Handle checkout cancellation
        if (data.type === 'checkout-cancel') {
          navigate('/checkout/cancel');
        }
      } catch (error) {
        console.error('Error handling Stripe iframe message:', error);
      }
    };

    // Add event listener for messages from the iframe
    window.addEventListener('message', handleMessage);
    
    // Handle iframe load event
    const handleIframeLoad = () => {
      setIsLoading(false);
    };
    
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      if (iframe) {
        iframe.removeEventListener('load', handleIframeLoad);
      }
    };
  }, [checkoutUrl, navigate]);

  return (
    <div className="relative w-full h-[600px]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-600">Loading checkout...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={checkoutUrl}
        className="w-full h-full border-0"
        title="Stripe Checkout"
        allow="payment"
      />
    </div>
  );
};
