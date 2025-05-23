import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PaymentElement,
  LinkAuthenticationElement,
  AddressElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSupabase } from '../context/SupabaseContext';
import { useAuth } from '../context/AuthContext';
import { getStateCode } from '../utils/stateUtils';

// Load Stripe outside of component to avoid recreating it on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// Wrapper component that provides the Stripe context
export const StripeElementsProvider: React.FC<{
  clientSecret: string;
  children: React.ReactNode;
}> = ({ clientSecret, children }) => {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
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
    }
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};

// The actual checkout form component
interface UserDataType {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  defaultAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
}

export const StripeElementsCheckout: React.FC<{
  onSuccess?: (paymentIntentId: string) => void;
  onCancel?: () => void;
  initialUserData?: UserDataType | null;
}> = ({ onSuccess, onCancel, initialUserData }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // User data for autofill
  const [userData, setUserData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    defaultAddress: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    } | null;
    defaultPaymentMethod: {
      cardNumber: string;
      expiryDate: string;
      cardholderName: string;
      lastFour: string;
    } | null;
  }>({
    firstName: initialUserData?.firstName || '',
    lastName: initialUserData?.lastName || '',
    email: initialUserData?.email || user?.email || '',
    phone: initialUserData?.phone || '',
    defaultAddress: initialUserData?.defaultAddress || null,
    defaultPaymentMethod: null
  });

  // Log initial user data for debugging
  useEffect(() => {
    if (initialUserData) {
      console.log('Initial user data provided:', initialUserData);
    }
  }, [initialUserData]);

  // Fetch user data for autofill
  const fetchUserData = async () => {
    try {
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      console.log('Fetching data for user:', user.id);

      // Set email from user object immediately
      if (user.email) {
        setEmail(user.email);
        setUserData(prev => ({
          ...prev,
          email: user.email
        }));
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        // Only log as error if it's not just "no rows returned"
        console.error('Error fetching user profile:', profileError);
      }

      // Fetch user addresses
      const { data: addresses, error: addressesError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (addressesError && addressesError.code !== 'PGRST116') {
        console.error('Error fetching user addresses:', addressesError);
      }

      // Log the address data for debugging
      if (addresses) {
        console.log('Default address found:', addresses);
        console.log('State value:', addresses.state);
      }

      // Fetch user payment methods
      const { data: paymentMethods, error: paymentMethodsError } = await supabase
        .from('user_payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (paymentMethodsError && paymentMethodsError.code !== 'PGRST116') {
        console.error('Error fetching user payment methods:', paymentMethodsError);
      }

      // Update user data state with whatever we found
      setUserData(prev => ({
        ...prev,
        firstName: profile?.first_name || user.user_metadata?.first_name || '',
        lastName: profile?.last_name || user.user_metadata?.last_name || '',
        phone: profile?.phone || user.user_metadata?.phone || '',
        defaultAddress: addresses ? {
          street: addresses.street || '',
          city: addresses.city || '',
          // Ensure state is properly formatted for Stripe's state field
          // This needs to be the two-letter state code for US addresses
          state: addresses.state || '',
          postalCode: addresses.postal_code || '',
          country: addresses.country || 'US'
        } : null,
        defaultPaymentMethod: paymentMethods ? {
          cardNumber: '•••• •••• •••• ' + (paymentMethods.last_four || ''),
          expiryDate: paymentMethods.expiry_date || '',
          cardholderName: paymentMethods.cardholder_name || '',
          lastFour: paymentMethods.last_four || ''
        } : null
      }));

      console.log('User data loaded for checkout:', {
        profile,
        addresses,
        paymentMethods
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Fetch user data when component mounts or user changes
    // Only fetch if initialUserData is not provided
    if (user && !initialUserData) {
      console.log('No initial user data provided, fetching from database...');
      fetchUserData();
    }
  }, [user, initialUserData]);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Check for payment intent status on page load
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) {
        setMessage('Something went wrong.');
        return;
      }

      switch (paymentIntent.status) {
        case 'succeeded':
          setMessage('Payment succeeded!');
          if (onSuccess) onSuccess(paymentIntent.id);
          break;
        case 'processing':
          setMessage('Your payment is processing.');
          break;
        case 'requires_payment_method':
          setMessage('Your payment was not successful, please try again.');
          break;
        default:
          setMessage('Something went wrong.');
          break;
      }
    });
  }, [stripe, onSuccess]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('🚨 PAYMENT FLOW - Submit button clicked');

    if (!stripe || !elements) {
      console.log('🚨 PAYMENT FLOW - Stripe or elements not loaded');
      // Stripe.js hasn't yet loaded.
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚨 PAYMENT FLOW - Starting payment submission');

      // First, get the payment element
      const paymentElement = elements.getElement(PaymentElement);
      if (!paymentElement) {
        console.error('🚨 PAYMENT FLOW - Payment element not found');
        throw new Error('Payment element not found');
      }

      console.log('🚨 PAYMENT FLOW - Payment element found');

      // Get the shipping address from the AddressElement
      const addressElement = elements.getElement(AddressElement);
      let shippingAddress = null;

      console.log('🚨 PAYMENT FLOW - Getting shipping address from AddressElement');
      if (addressElement) {
        console.log('🚨 PAYMENT FLOW - AddressElement found');
        const addressValue = await addressElement.getValue();
        console.log('🚨 PAYMENT FLOW - AddressElement value:', addressValue);

        if (addressValue.complete) {
          shippingAddress = addressValue.value;
          console.log('🚨 PAYMENT FLOW - Shipping address complete:', JSON.stringify(shippingAddress, null, 2));

          // Store shipping address in localStorage for later use
          localStorage.setItem('last_shipping_address', JSON.stringify(shippingAddress));
          console.log('🚨 PAYMENT FLOW - Saved shipping address to localStorage');

          // Also store in sessionStorage as a backup
          sessionStorage.setItem('last_shipping_address', JSON.stringify(shippingAddress));
          console.log('🚨 PAYMENT FLOW - Also saved shipping address to sessionStorage as backup');

          // Send the shipping address to the server immediately
          try {
            console.log('🚨 PAYMENT FLOW - Sending shipping address to server');
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-shipping-address`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                paymentIntentId: clientSecret.split('_secret_')[0],
                shippingAddress: shippingAddress
              })
            });

            const result = await response.json();
            console.log('🚨 PAYMENT FLOW - Server response for shipping address:', result);
          } catch (error) {
            console.error('🚨 PAYMENT FLOW - Error sending shipping address to server:', error);
          }
        } else {
          console.warn('🚨 PAYMENT FLOW - Address element not complete');
        }
      } else {
        console.warn('🚨 PAYMENT FLOW - Address element not found');
      }

      // Confirm the payment without redirecting
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          receipt_email: email,
          return_url: `${window.location.origin}/checkout/success`,
          payment_method_data: {
            billing_details: {
              email: email,
            }
          },
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
          } : undefined
        },
      });

      // If payment succeeded and we have a paymentIntent, handle success in the same tab
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('🚨 PAYMENT FLOW - Payment succeeded, handling success in the same tab');
        console.log('🚨 PAYMENT FLOW - Payment intent:', paymentIntent);

        // Get shipping address from various storage options
        let savedShippingAddress = localStorage.getItem('last_shipping_address');

        // If not in localStorage, try sessionStorage
        if (!savedShippingAddress) {
          console.log('🚨 PAYMENT FLOW - No shipping address in localStorage, checking sessionStorage');
          savedShippingAddress = sessionStorage.getItem('last_shipping_address');

          if (savedShippingAddress) {
            console.log('🚨 PAYMENT FLOW - Found shipping address in sessionStorage');
          } else {
            console.log('🚨 PAYMENT FLOW - No shipping address found in sessionStorage either');

            // Try the backup from the AddressElement onChange event
            console.log('🚨 PAYMENT FLOW - Checking for backup shipping address');
            const backupAddress = localStorage.getItem('current_shipping_address') ||
              sessionStorage.getItem('current_shipping_address');

            if (backupAddress) {
              console.log('🚨 PAYMENT FLOW - Found backup shipping address');
              savedShippingAddress = backupAddress;
            } else {
              console.log('🚨 PAYMENT FLOW - No backup shipping address found either');
            }
          }
        } else {
          console.log('🚨 PAYMENT FLOW - Found shipping address in localStorage');
        }

        console.log('🚨 PAYMENT FLOW - Payment succeeded, checking for saved shipping address');

        // Update the order with the shipping address
        if (savedShippingAddress && user) {
          try {
            const shippingAddressObj = JSON.parse(savedShippingAddress);
            console.log('🔍 DEBUG - Found shipping address in localStorage:', JSON.stringify(shippingAddressObj, null, 2));

            // Call the update-shipping-address Edge Function
            console.log('🚨 PAYMENT FLOW - Calling update-shipping-address Edge Function');

            try {
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-shipping-address`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                  paymentIntentId: paymentIntent.id,
                  shippingAddress: shippingAddressObj
                })
              });

              const result = await response.json();

              if (response.ok) {
                console.log('🚨 PAYMENT FLOW - Successfully updated shipping address via Edge Function:', result);
              } else {
                console.error('🚨 PAYMENT FLOW - Error updating shipping address via Edge Function:', result);

                // Fallback to direct database update
                console.log('🚨 PAYMENT FLOW - Falling back to direct database update');

                // Find the order with this payment intent
                console.log('🚨 PAYMENT FLOW - Looking for order with payment intent ID:', paymentIntent.id);
                const { data: orderData, error: orderError } = await supabase
                  .from('stripe_orders')
                  .select('id, shipping_address')
                  .eq('payment_intent_id', paymentIntent.id)
                  .maybeSingle();

                if (orderError) {
                  console.error('🚨 PAYMENT FLOW - Error finding order:', orderError);
                } else if (orderData) {
                  console.log('🚨 PAYMENT FLOW - Found order with ID:', orderData.id);

                  // Create shipping address object
                  const shippingAddressToSave = {
                    name: shippingAddressObj.name,
                    line1: shippingAddressObj.address.line1,
                    line2: shippingAddressObj.address.line2 || null,
                    city: shippingAddressObj.address.city,
                    state: shippingAddressObj.address.state,
                    postal_code: shippingAddressObj.address.postal_code,
                    country: shippingAddressObj.address.country,
                    phone: shippingAddressObj.phone
                  };

                  // Fetch shipping configuration
                  let shippingConfig = {
                    base_shipping_cost: 400, // Default: $4.00 in cents
                    additional_item_cost: 100 // Default: $1.00 in cents
                  };

                  try {
                    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shipping-config`, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                      }
                    });

                    if (response.ok) {
                      const data = await response.json();
                      shippingConfig = {
                        base_shipping_cost: data.base_shipping_cost,
                        additional_item_cost: data.additional_item_cost
                      };
                      console.log('🚨 PAYMENT FLOW - Fetched shipping config:', shippingConfig);
                    }
                  } catch (error) {
                    console.error('🚨 PAYMENT FLOW - Error fetching shipping config:', error);
                  }

                  // Get cart items from localStorage to calculate shipping cost
                  let cartItems = [];
                  try {
                    const cartKey = user ? `cart_${user.id}` : 'cart_guest';
                    const savedCart = localStorage.getItem(cartKey);
                    if (savedCart) {
                      cartItems = JSON.parse(savedCart);
                      console.log(`🚨 PAYMENT FLOW - Cart items from ${cartKey}:`, cartItems);
                    }
                  } catch (error) {
                    console.error('Error parsing cart items:', error);
                  }

                  // Calculate total quantity for shipping cost
                  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0) || 1;

                  // Calculate shipping cost based on quantity and configuration
                  let shippingCost = shippingConfig.base_shipping_cost;
                  if (totalQuantity > 1) {
                    shippingCost = shippingConfig.base_shipping_cost + ((totalQuantity - 1) * shippingConfig.additional_item_cost);
                  }
                  console.log(`🚨 PAYMENT FLOW - Calculated shipping cost: $${shippingCost / 100} for ${totalQuantity} items`);

                  // Update the order with the shipping address
                  const { error: updateError } = await supabase
                    .from('stripe_orders')
                    .update({
                      shipping_address: shippingAddressToSave,
                      shipping_cost: shippingCost,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', orderData.id);

                  if (updateError) {
                    console.error('🚨 PAYMENT FLOW - Error updating order with shipping address:', updateError);
                  } else {
                    console.log('🚨 PAYMENT FLOW - Successfully updated order with shipping address');
                  }
                }
              }
            } catch (edgeFunctionError) {
              console.error('🚨 PAYMENT FLOW - Exception calling Edge Function:', edgeFunctionError);
            }

            // Clear all storage after update attempt
            localStorage.removeItem('last_shipping_address');
            sessionStorage.removeItem('last_shipping_address');
            localStorage.removeItem('current_shipping_address');
            sessionStorage.removeItem('current_shipping_address');
            console.log('🚨 PAYMENT FLOW - Cleared all shipping addresses from storage');
          } catch (error) {
            console.error('Error processing shipping address:', error);
          }
        } else {
          console.log('No shipping address found in localStorage or user not authenticated');
        }

        if (onSuccess) {
          onSuccess(paymentIntent.id);
        }
        return;
      }

      // Handle errors
      if (error) {
        console.error('Payment error:', error);
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setMessage(error.message || 'An unexpected error occurred');
        } else {
          setMessage('An unexpected error occurred');
        }
        toast.error(error.message || 'Payment failed. Please try again.');
      }
    } catch (e) {
      console.error('Exception during payment processing:', e);
      setMessage('An unexpected error occurred during payment processing');
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !promoCode.trim()) {
      return;
    }

    setIsApplyingPromo(true);
    setPromoMessage(null);

    try {
      const result = await stripe.applyPromotionCode({
        promotionCode: promoCode.trim(),
        elements
      });

      if (result.error) {
        setPromoMessage({
          text: result.error.message || 'Failed to apply promotion code',
          type: 'error'
        });
      } else {
        setPromoMessage({
          text: 'Promotion code applied successfully!',
          type: 'success'
        });
      }
    } catch (error: any) {
      setPromoMessage({
        text: error.message || 'An error occurred',
        type: 'error'
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/checkout');
    }
  };

  // Effect to update Stripe Elements when user data is loaded
  useEffect(() => {
    if (!elements || !userData) return;

    try {
      // Log the user data for debugging
      console.log('User data for autofill:', {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        defaultAddress: userData.defaultAddress,
      });

      // We can't directly update the elements after they're mounted
      // The defaultValues are only used during initial render
      // This is a limitation of Stripe Elements

      // However, we can force a re-render of the elements by unmounting and remounting them
      // This is not ideal, but it's the only way to update the values
      // We're not implementing this approach here as it would require significant changes

      // Instead, we'll rely on the defaultValues being set correctly during initial render
      // This is why it's important to fetch user data before rendering the elements

    } catch (error) {
      console.error('Error updating Stripe elements:', error);
    }
  }, [elements, userData]);

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
      <LinkAuthenticationElement
        id="link-authentication-element"
        onChange={(e) => setEmail(e.value.email)}
        options={{
          defaultValues: {
            email: userData.email,
          },
        }}
      />

      {/* Shipping Address */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Shipping Address</h3>
        {userData.defaultAddress && (
          <div className="mb-2 text-xs text-gray-500">
            Debug - State value: {userData.defaultAddress.state}
          </div>
        )}
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
            defaultValues: {
              name: userData.firstName && userData.lastName ?
                `${userData.firstName} ${userData.lastName}`.trim() : '',
              address: userData.defaultAddress ? {
                line1: userData.defaultAddress.street || '',
                city: userData.defaultAddress.city || '',
                // Convert state to proper 2-letter code for US addresses
                state: userData.defaultAddress.country === 'US' ?
                  getStateCode(userData.defaultAddress.state || '') :
                  userData.defaultAddress.state || '',
                postal_code: userData.defaultAddress.postalCode || '',
                country: userData.defaultAddress.country || 'US',
              } : undefined,
              phone: userData.phone || '',
            },
          }}
          onChange={(event) => {
            if (event.complete) {
              // Log the complete address for debugging
              console.log("🚨 PAYMENT FLOW - Address element complete:", event.value);

              // Store the address in localStorage immediately when it's complete
              // This provides a backup in case the address isn't captured during payment
              try {
                localStorage.setItem('current_shipping_address', JSON.stringify(event.value));
                sessionStorage.setItem('current_shipping_address', JSON.stringify(event.value));
                console.log("🚨 PAYMENT FLOW - Stored shipping address in storage as backup");
              } catch (error) {
                console.error("🚨 PAYMENT FLOW - Error storing shipping address:", error);
              }
            }
          }}
        />
      </div>

      {/* Payment Method */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Method</h3>
        {userData.defaultPaymentMethod && (
          <div className="mb-2 text-sm text-gray-600">
            <p>Your saved card ending in {userData.defaultPaymentMethod.lastFour} will be available as a payment option.</p>
          </div>
        )}
        <PaymentElement
          id="payment-element"
          options={{
            defaultValues: {
              billingDetails: {
                name: userData.defaultPaymentMethod?.cardholderName ||
                  (userData.firstName && userData.lastName ?
                    `${userData.firstName} ${userData.lastName}`.trim() :
                    undefined),
                email: userData.email || undefined,
                phone: userData.phone || undefined,
                address: userData.defaultAddress ? {
                  line1: userData.defaultAddress.street,
                  city: userData.defaultAddress.city,
                  state: userData.defaultAddress.country === 'US' ?
                    getStateCode(userData.defaultAddress.state) :
                    userData.defaultAddress.state,
                  postal_code: userData.defaultAddress.postalCode,
                  country: userData.defaultAddress.country,
                } : undefined,
              }
            },
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            }
          }}
        />
      </div>

      {/* Promo Code */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Promo Code</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter promo code"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
          />
          <button
            type="button"
            onClick={handleApplyPromoCode}
            disabled={isApplyingPromo || !promoCode.trim() || !stripe || !elements}
            className="px-4 py-2 bg-gray-800 text-white rounded-md font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplyingPromo ? (
              <Loader className="animate-spin h-4 w-4" />
            ) : (
              'Apply'
            )}
          </button>
        </div>
        {promoMessage && (
          <div className={`mt-2 text-sm ${promoMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {promoMessage.text}
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-3">
        <button
          disabled={isLoading || !stripe || !elements}
          id="submit"
          className="w-full py-3 px-4 bg-black text-white rounded-md font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Processing...
            </>
          ) : (
            'Pay now'
          )}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-md font-medium"
        >
          Cancel
        </button>
      </div>

      {message && (
        <div className="mt-4 text-center text-sm text-red-600">
          {message}
        </div>
      )}
    </form>
  );
};
