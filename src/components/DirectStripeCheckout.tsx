import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  AddressElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSupabase } from '../context/SupabaseContext';
import { useAuth } from '../context/AuthContext';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Log Stripe key for debugging
console.log('Stripe public key available:', !!import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// The main checkout component
export const DirectStripeCheckout: React.FC<{
  clientSecret: string;
  onSuccess?: (paymentIntentId: string) => void;
  onCancel?: () => void;
}> = ({ clientSecret, onSuccess, onCancel }) => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    } | null;
  } | null>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching user data for checkout...');

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        // Fetch user addresses
        const { data: address, error: addressError } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle();

        if (addressError && addressError.code !== 'PGRST116') {
          console.error('Error fetching address:', addressError);
        }

        // Set user data
        const formattedData = {
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          email: user.email || '',
          phone: profile?.phone || '',
          address: address ? {
            line1: address.street || '',
            city: address.city || '',
            state: address.state || '',
            postal_code: address.postal_code || '',
            country: address.country || 'US'
          } : null
        };

        setUserData(formattedData);
        console.log('User data loaded for checkout:', formattedData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, supabase]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="animate-spin h-8 w-8 text-black" />
        <span className="ml-2">Loading your information...</span>
      </div>
    );
  }

  // Stripe Elements options
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#000000',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px',
      },
    },
  };

  // Add error handling for Stripe initialization
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    const checkStripe = async () => {
      try {
        const stripe = await stripePromise;
        if (!stripe) {
          setStripeError('Failed to load Stripe. Please refresh the page and try again.');
          console.error('Stripe failed to load');
        }
      } catch (error) {
        console.error('Error initializing Stripe:', error);
        setStripeError('Failed to initialize payment system. Please refresh the page and try again.');
      }
    };

    checkStripe();
  }, []);

  if (stripeError) {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-red-50 text-red-700 rounded-md">
        <p className="font-medium">Payment Error</p>
        <p>{stripeError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-black text-white rounded-md"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Log the client secret for debugging (mask most of it)
  useEffect(() => {
    if (clientSecret) {
      const maskedSecret = clientSecret.substring(0, 10) + '...' + clientSecret.substring(clientSecret.length - 5);
      console.log('Client secret received (masked):', maskedSecret);
    } else {
      console.error('No client secret provided to DirectStripeCheckout');
    }
  }, [clientSecret]);

  return (
    <div className="w-full max-w-md mx-auto">
      {clientSecret ? (
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            userData={userData}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      ) : (
        <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
          <p>Unable to initialize payment form. Missing payment information.</p>
        </div>
      )}
    </div>
  );
};

// The actual form component
const CheckoutForm: React.FC<{
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    } | null;
  } | null;
  onSuccess?: (paymentIntentId: string) => void;
  onCancel?: () => void;
}> = ({ userData, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState(userData?.email || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/checkout/success',
        receipt_email: email,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'An unexpected error occurred.');
      toast.error(error.message || 'Payment failed');
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast.success('Payment successful!');
      if (onSuccess) {
        onSuccess(paymentIntent.id);
      } else {
        navigate('/checkout/success');
      }
    } else {
      setMessage('Unexpected payment state.');
    }

    setIsLoading(false);
  };

  // Check if Stripe and Elements are loaded
  const [elementsLoaded, setElementsLoaded] = useState(false);
  const [elementsError, setElementsError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      console.error('Stripe not loaded in CheckoutForm');
    }
    if (!elements) {
      console.error('Elements not loaded in CheckoutForm');
    } else {
      setElementsLoaded(true);
    }
  }, [stripe, elements]);

  // If there's an error loading the elements, show an error message
  if (elementsError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <p className="font-medium">Payment Form Error</p>
        <p>{elementsError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-black text-white rounded-md"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // If elements aren't loaded yet, show a loading indicator
  if (!elementsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader className="animate-spin h-8 w-8 text-black mb-4" />
        <p>Loading payment form...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div>
        <LinkAuthenticationElement
          options={{
            defaultValues: {
              email: userData?.email || '',
            },
          }}
          onChange={(e) => setEmail(e.value.email)}
        />
      </div>

      {/* Shipping Address */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Shipping Address</h3>
        <AddressElement
          options={{
            mode: 'shipping',
            allowedCountries: ['US', 'CA', 'GB', 'AU'],
            fields: {
              phone: 'always',
            },
            validation: {
              phone: {
                required: 'always',
              },
            },
            defaultValues: userData ? {
              name: userData.firstName && userData.lastName ?
                `${userData.firstName} ${userData.lastName}`.trim() : '',
              address: userData.address || undefined,
              phone: userData.phone || '',
            } : undefined,
          }}
        />
      </div>

      {/* Payment Method */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Method</h3>
        <PaymentElement
          options={{
            defaultValues: {
              billingDetails: {
                name: userData?.firstName && userData?.lastName ?
                  `${userData.firstName} ${userData.lastName}`.trim() : undefined,
                email: userData?.email || undefined,
                phone: userData?.phone || undefined,
                address: userData?.address || undefined,
              }
            },
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            }
          }}
        />
      </div>

      {/* Error Message */}
      {message && (
        <div className="text-red-500 text-sm">{message}</div>
      )}

      {/* Submit Button */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-black border border-transparent rounded-md hover:bg-gray-900 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Processing...
            </span>
          ) : (
            'Pay Now'
          )}
        </button>
      </div>
    </form>
  );
};
