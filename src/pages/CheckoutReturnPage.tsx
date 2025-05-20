import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { stripePromise } from '../lib/stripe';

export const CheckoutReturnPage: React.FC = () => {
  const [status, setStatus] = useState<'success' | 'cancel' | 'processing'>('processing');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCheckoutSession = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        navigate('/checkout/cancel');
        return;
      }

      try {
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Failed to load Stripe');
        }

        const { error, status: sessionStatus } = await stripe.retrieveCheckoutSession(sessionId);

        if (error) {
          console.error('Error retrieving checkout session:', error);
          setStatus('cancel');
          setTimeout(() => navigate('/checkout/cancel'), 1000);
        } else if (sessionStatus === 'complete') {
          setStatus('success');
          setTimeout(() => navigate(`/checkout/success?session_id=${sessionId}`), 1000);
        } else {
          setStatus('cancel');
          setTimeout(() => navigate('/checkout/cancel'), 1000);
        }
      } catch (error) {
        console.error('Error in checkout return:', error);
        setStatus('cancel');
        setTimeout(() => navigate('/checkout/cancel'), 1000);
      }
    };

    fetchCheckoutSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-600 text-lg">
              {status === 'processing' && 'Processing your payment...'}
              {status === 'success' && 'Payment successful! Redirecting...'}
              {status === 'cancel' && 'Payment unsuccessful. Redirecting...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
