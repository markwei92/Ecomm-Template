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
import { useCart } from '../context/CartContext';
import { getShippingConfig, calculateShippingCost, updateShippingAddress } from '../api/shipping-proxy';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Log Stripe key for debugging
console.log('Simple checkout - Stripe public key available:', !!import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// User data interface
interface UserData {
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
}

// The main checkout component
export const SimpleStripeCheckout: React.FC<{
  clientSecret: string;
  onSuccess?: (paymentIntentId: string) => void;
  onCancel?: () => void;
}> = ({ clientSecret, onSuccess, onCancel }) => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data for autofill
  useEffect(() => {
    const fetchUserData = async () => {
      // For guest users, we don't need to fetch user data
      if (!user) {
        console.log('Guest user detected in SimpleStripeCheckout - no data to fetch');
        setUserData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: null
        });
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching user data for autofill...');

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        } else {
          console.log('Profile data:', profile);
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
        } else {
          console.log('Address data:', address);
        }

        // Set user data
        setUserData({
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
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, supabase]);

  // Log the client secret for debugging (mask most of it)
  useEffect(() => {
    if (clientSecret) {
      const maskedSecret = clientSecret.substring(0, 10) + '...' + clientSecret.substring(clientSecret.length - 5);
      console.log('Simple checkout - Client secret received (masked):', maskedSecret);
    } else {
      console.error('Simple checkout - No client secret provided');
    }
  }, [clientSecret]);

  // Stripe Elements options
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#000000',
        colorBackground: '#ffffff',
        colorText: '#1a1a1a',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px'
      },
      rules: {
        '.Input': {
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '12px 16px',
          minHeight: '44px',
          lineHeight: '1.5'
        },
        '.Input:focus': {
          border: '1px solid #000000',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }
      }
    },
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="animate-spin h-8 w-8 text-black" />
        <span className="ml-2">Loading your information...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {clientSecret ? (
        <Elements stripe={stripePromise} options={options}>
          <SimpleCheckoutForm
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
const SimpleCheckoutForm: React.FC<{
  userData: UserData | null;
  onSuccess?: (paymentIntentId: string) => void;
  onCancel?: () => void;
}> = ({ userData, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState(userData?.email || '');
  const { state } = useCart(); // Get cart state from CartContext

  useEffect(() => {
    if (!stripe) {
      console.log('Simple checkout - Stripe not loaded');
    }
    if (!elements) {
      console.log('Simple checkout - Elements not loaded');
    } else {
      console.log('Simple checkout - Elements loaded successfully');
    }
  }, [stripe, elements]);

  // Function to fetch shipping configuration using local proxy
  const fetchShippingConfig = async () => {
    try {
      console.log('Simple checkout - Using local proxy to fetch shipping configuration');

      // Use our local proxy to get shipping config directly from the database
      const config = await getShippingConfig();

      console.log('Simple checkout - Fetched shipping config via proxy:', config);

      return {
        baseShippingCost: config.base_shipping_cost,
        additionalItemCost: config.additional_item_cost
      };
    } catch (error) {
      console.error('Simple checkout - Error fetching shipping config via proxy:', error);
      // Return default values
      return {
        baseShippingCost: 400, // $4.00 in cents
        additionalItemCost: 100 // $1.00 in cents
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('Simple checkout - Stripe or Elements not loaded');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      console.log('Simple checkout - Confirming payment...');
      // Get shipping address from localStorage
      let shippingAddress = null;
      try {
        const savedShippingAddress = localStorage.getItem('last_shipping_address');
        if (savedShippingAddress) {
          // Parse the saved address
          const parsedAddress = JSON.parse(savedShippingAddress);

          // Create a copy without the email property for Stripe
          // (we'll keep the email in our database, but Stripe doesn't accept it in the shipping object)
          shippingAddress = {
            ...parsedAddress,
            // Store email separately but don't include it in the shipping object for Stripe
          };

          // Remove email from the shipping object for Stripe
          if (shippingAddress.email) {
            console.log('Simple checkout - Removing email from shipping address for Stripe:', shippingAddress.email);
            delete shippingAddress.email;
          }

          console.log('Simple checkout - Using shipping address:', shippingAddress);
        }
      } catch (error) {
        console.error('Error parsing shipping address:', error);
      }

      // Get cart items from CartContext to calculate shipping cost
      const cartItems = state.items;
      console.log('Simple checkout - Cart items from CartContext:', cartItems);

      // Calculate total quantity for shipping cost
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      console.log('Simple checkout - Total quantity:', totalQuantity);

      // Get shipping configuration and calculate cost
      let shippingCost;
      try {
        // Get shipping config from our local proxy
        const shippingConfig = await fetchShippingConfig();

        // Use our helper function to calculate shipping cost
        shippingCost = calculateShippingCost(totalQuantity, {
          base_shipping_cost: shippingConfig.baseShippingCost,
          additional_item_cost: shippingConfig.additionalItemCost,
          source: 'from-config'
        });

        console.log(`Simple checkout - Calculated shipping cost: $${shippingCost / 100} for ${totalQuantity} items`);
      } catch (error) {
        // Fallback to direct calculation if proxy fails
        console.error('Simple checkout - Error using proxy, calculating directly:', error);

        // Use our helper with default values
        shippingCost = calculateShippingCost(totalQuantity);

        console.log(`Simple checkout - Calculated shipping cost with defaults: $${shippingCost / 100} for ${totalQuantity} items`);
      }

      // Store shipping cost in localStorage for guest users
      try {
        localStorage.setItem('guest_shipping_cost', shippingCost.toString());
        console.log('Simple checkout - Stored shipping cost in localStorage for guest users:', shippingCost);
      } catch (error) {
        console.error('Simple checkout - Error storing shipping cost in localStorage:', error);
      }

      // Get promo code from localStorage
      let promoCode = '';
      try {
        promoCode = localStorage.getItem('promoCode') || '';
        if (promoCode) {
          console.log('Simple checkout - Using promo code:', promoCode);

          // Special handling for TEST10 to ensure it's always 10%
          if (promoCode === 'TEST10') {
            console.log('Simple checkout - TEST10 promo code detected, ensuring 10% discount');
          }
        }
      } catch (error) {
        console.error('Error getting promo code:', error);
      }

      // Create payment confirmation options
      const confirmOptions: any = {
        elements,
        confirmParams: {
          return_url: window.location.origin + '/checkout/success',
          receipt_email: email,
          shipping: shippingAddress ? {
            address: {
              line1: shippingAddress.address.line1,
              line2: shippingAddress.address.line2 || undefined,
              city: shippingAddress.address.city,
              state: shippingAddress.address.state,
              postal_code: shippingAddress.address.postal_code,
              country: shippingAddress.address.country,
            },
            name: shippingAddress.name,
            phone: shippingAddress.phone,
            // Remove email from shipping object as Stripe doesn't accept it
          } : undefined
        },
        redirect: 'if_required',
      };

      // Add metadata to payment intent
      if (confirmOptions.confirmParams) {
        confirmOptions.confirmParams.payment_method_data = {
          metadata: {
            cart_quantity: totalQuantity.toString(),
            promo_code: promoCode || undefined,
            shipping_cost: shippingCost.toString(),
            calculated_shipping: 'true',
            customer_email: email || undefined // Add email to metadata
          }
        };
      }

      try {
        // Log only the relevant parts of the confirmOptions to avoid circular references
        console.log('Simple checkout - Confirming payment with options:', {
          confirmParams: {
            return_url: confirmOptions.confirmParams.return_url,
            receipt_email: confirmOptions.confirmParams.receipt_email,
            shipping: confirmOptions.confirmParams.shipping ? {
              address: confirmOptions.confirmParams.shipping.address,
              name: confirmOptions.confirmParams.shipping.name,
              phone: confirmOptions.confirmParams.shipping.phone
            } : undefined,
            payment_method_data: confirmOptions.confirmParams.payment_method_data
          },
          redirect: confirmOptions.redirect
        });

        const result = await stripe.confirmPayment(confirmOptions);

        // Log only specific properties of the result to avoid circular references
        console.log('Simple checkout - Payment confirmation result:', {
          error: result.error ? {
            type: result.error.type,
            code: result.error.code,
            message: result.error.message
          } : null,
          paymentIntent: result.paymentIntent ? {
            id: result.paymentIntent.id,
            status: result.paymentIntent.status,
            amount: result.paymentIntent.amount
          } : null
        });

        const { error, paymentIntent } = result;

        if (error) {
          console.error('Simple checkout - Payment error:', error);
          console.error('Simple checkout - Error details:', {
            type: error.type,
            code: error.code,
            message: error.message,
            decline_code: error.decline_code
          });
          setMessage(error.message || 'An unexpected error occurred.');
          toast.error(error.message || 'Payment failed');
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          console.log('Simple checkout - Payment succeeded:', paymentIntent.id);
          toast.success('Payment successful!');

          // We don't need to update the order here since the StripeCheckoutWrapper
          // will handle that in its onSuccess callback

          if (onSuccess) {
            onSuccess(paymentIntent.id);
          } else {
            navigate('/checkout/success');
          }
        } else {
          console.warn('Simple checkout - Unexpected payment state:', paymentIntent);
          setMessage('Unexpected payment state.');
        }
      } catch (confirmError) {
        console.error('Simple checkout - Exception during confirmPayment:', confirmError);

        // Log error details in a safe way
        if (confirmError instanceof Error) {
          console.error('Simple checkout - Error details:', {
            name: confirmError.name,
            message: confirmError.message,
            stack: confirmError.stack
          });
        }

        setMessage('Error processing payment. Please try again.');
        toast.error('Payment processing failed. Please try again.');
      }
    } catch (error) {
      console.error('Simple checkout - Error during payment confirmation:', error);
      setMessage('An unexpected error occurred during payment processing.');
    } finally {
      setIsLoading(false);
    }
  };

  // Log user data for debugging
  useEffect(() => {
    console.log('User data for autofill:', userData);
  }, [userData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          onChange={(event) => {
            if (event.complete) {
              // Add email to the shipping address
              const shippingAddressWithEmail = {
                ...event.value,
                email: email // Add the email from the LinkAuthenticationElement
              };

              console.log("🔍 DEBUG - SimpleStripeCheckout - Adding email to shipping address:", email);

              // Store shipping address in localStorage for later use
              localStorage.setItem('last_shipping_address', JSON.stringify(shippingAddressWithEmail));
              sessionStorage.setItem('last_shipping_address', JSON.stringify(shippingAddressWithEmail));

              // Also store in a more permanent location
              localStorage.setItem('current_shipping_address', JSON.stringify(shippingAddressWithEmail));
              sessionStorage.setItem('current_shipping_address', JSON.stringify(shippingAddressWithEmail));

              console.log("� IMPORTANT - SimpleStripeCheckout - Address element complete:", JSON.stringify(event.value, null, 2));

              // Try to update all recent orders with this shipping address
              try {
                const updateAddressForOrders = async () => {
                  console.log("🚨 IMPORTANT - SimpleStripeCheckout - Updating all recent orders with this shipping address");

                  // Use our local proxy to update shipping addresses
                  const shippingAddressWithEmail = {
                    ...event.value,
                    email: email // Add the email from the LinkAuthenticationElement
                  };

                  console.log("🚨 IMPORTANT - SimpleStripeCheckout - Updating shipping address via local proxy");

                  try {
                    // Call our local proxy function - import from shipping-proxy.ts
                    const result = await updateShippingAddress(shippingAddressWithEmail);

                    console.log("🚨 IMPORTANT - SimpleStripeCheckout - Update shipping address result:", result);

                    if (result && result.success) {
                      console.log(`🚨 IMPORTANT - SimpleStripeCheckout - Successfully updated ${result.updated || 0} orders`);
                    } else if (result) {
                      console.error("🚨 IMPORTANT - SimpleStripeCheckout - Failed to update shipping address:", result.error);
                    }
                  } catch (error) {
                    console.error("🚨 IMPORTANT - SimpleStripeCheckout - Error calling updateShippingAddress:", error);
                  }
                };

                updateAddressForOrders().catch(error => {
                  console.error("🚨 IMPORTANT - SimpleStripeCheckout - Error updating shipping address:", error);
                });
              } catch (error) {
                console.error("🚨 IMPORTANT - SimpleStripeCheckout - Error updating shipping address:", error);
              }
            } else {
              console.log("🔍 DEBUG - SimpleStripeCheckout - Address element not complete yet");
            }
          }}
        />
      </div>

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
          }}
        />
      </div>

      {message && (
        <div className="text-red-500 text-sm">{message}</div>
      )}

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
