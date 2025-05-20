import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, CreditCard, Loader, ArrowLeft, Check, X, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createPaymentIntent, PaymentIntentResponse, validatePromoCode } from '../lib/stripe';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { createOrderFromPaymentIntent, debugStripeOrdersTable } from '../lib/orders';
import { StripeCheckoutWrapper } from '../components/StripeCheckoutWrapper';

export const CheckoutPage: React.FC = () => {
  const { state, dispatch } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingCost, setShippingCost] = useState({ base_price: 400, additional_item_price: 100 });
  const [isLoadingShipping, setIsLoadingShipping] = useState(true);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoCodeValid, setPromoCodeValid] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [discount, setDiscount] = useState({
    type: '' as 'percentage' | 'fixed_amount' | '',
    amount: 0
  });

  useEffect(() => {
    if (state.items.length === 0) {
      navigate('/products');
      return;
    }
  }, [state.items.length, navigate]);

  useEffect(() => {
    const fetchShippingCost = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'shipping_price')
          .single();

        if (error) throw error;

        if (data) {
          setShippingCost(data.value);
        }
      } catch (error) {
        console.error('Error fetching shipping cost:', error);
      } finally {
        setIsLoadingShipping(false);
      }
    };

    fetchShippingCost();
  }, []);

  const calculateShipping = () => {
    if (state.items.length === 0) return 0;
    const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
    // Calculate shipping in dollars (not cents)
    return (shippingCost.base_price + (Math.max(0, totalItems - 1) * shippingCost.additional_item_price)) / 100;
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoMessage('Please enter a promo code');
      return;
    }

    setIsValidatingPromo(true);
    setPromoMessage('');

    try {
      const result = await validatePromoCode(promoCode);

      if (result.valid) {
        setPromoCodeValid(true);
        setPromoMessage(result.message || 'Promo code applied successfully!');
        setDiscount({
          type: result.discountType || '',
          amount: result.discountAmount || 0
        });
      } else {
        setPromoCodeValid(false);
        setPromoMessage(result.message || 'Invalid promo code');
        setDiscount({
          type: '',
          amount: 0
        });
      }
    } catch (error: any) {
      console.error('Error validating promo code:', error);
      setPromoCodeValid(false);
      setPromoMessage(error.message || 'Failed to validate promo code');
      setDiscount({
        type: '',
        amount: 0
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const calculateDiscount = (subtotal: number) => {
    if (!promoCodeValid || !discount.amount) return 0;

    if (discount.type === 'percentage') {
      // Calculate exact percentage without rounding
      return (subtotal * discount.amount) / 100;
    } else if (discount.type === 'fixed_amount') {
      return Math.min(discount.amount, subtotal); // Don't allow discount to exceed subtotal
    }

    return 0;
  };

  const subtotal = state.items.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0
  );

  const discountAmount = calculateDiscount(subtotal);
  const discountedSubtotal = subtotal - discountAmount;

  const shipping = calculateShipping();
  const finalTotal = discountedSubtotal + shipping;

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    const customUser = localStorage.getItem('user');
    const isGuestUser = !session && !customUser;

    if (newQuantity < 1) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });

      // Remove from database only for authenticated users
      if (!isGuestUser && session) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);
      }

      // If cart becomes empty after removing item, redirect to products page
      if (state.items.length === 1) {
        toast.info('Your cart is empty. Redirecting to products...');
        setTimeout(() => navigate('/products'), 1500);
      }
    } else {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: { productId: itemId, quantity: newQuantity }
      });

      // Update in database only for authenticated users
      if (!isGuestUser && session) {
        await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', itemId)
          .eq('user_id', session.user.id);
      }
    }
  };

  const handleCheckout = async () => {
    try {
      setIsProcessing(true);

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      const customUser = localStorage.getItem('user');
      const isGuestUser = !session && !customUser;

      if (isGuestUser) {
        console.log('Guest checkout initiated');
      } else if (!session && customUser) {
        console.log('Using custom auth without Supabase session, attempting to create session');
        try {
          // Parse the custom user
          const userData = JSON.parse(customUser);

          // Try to sign in with email only (passwordless) to create a session
          // This is just to get a valid session token for API calls
          const { error: signInError } = await supabase.auth.signInWithOtp({
            email: userData.email,
            options: {
              shouldCreateUser: false
            }
          });

          if (signInError) {
            console.log('Failed to create session for custom auth user:', signInError);
            // Continue anyway, we'll use the custom auth approach
          } else {
            console.log('Successfully created temporary session for custom auth user');
          }
        } catch (authError) {
          console.error('Error creating session for custom auth:', authError);
          // Continue anyway
        }
      }

      const items = state.items.map(item => ({
        price: item.price,
        quantity: item.quantity,
        title: item.title,
        color: item.color,
        size: item.size,
        image: item.image,
        personalizationText: item.personalizationText
      }));

      // Calculate shipping cost
      const shippingAmount = calculateShipping();
      console.log('Creating payment intent with items:', items, 'and shipping cost:', shippingAmount);

      // Create a payment intent for Stripe Elements
      const intent = await createPaymentIntent(items, promoCode, undefined, shippingAmount);
      console.log('Payment intent created:', intent,
        promoCode ? `with promo code: ${promoCode}` : 'without promo code',
        `and shipping cost: $${shippingAmount.toFixed(2)}`
      );

      // Set the payment intent to display the Stripe Elements form
      setPaymentIntent(intent);
      setIsProcessing(false);
    } catch (error: any) {
      console.error('Payment intent error:', error);
      toast.error(error.message || 'Failed to start checkout process');
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      console.log('Payment successful, creating order for payment intent:', paymentIntentId);

      const items = state.items.map(item => ({
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        image: item.image,
        personalizationText: item.personalizationText
      }));

      const orderSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const orderDiscount = calculateDiscount(orderSubtotal);
      const discountedSubtotal = orderSubtotal - orderDiscount;
      const totalAmount = discountedSubtotal + shipping; // Add shipping cost to the total

      // Get shipping address from localStorage if available
      let shippingAddress = null;
      try {
        console.log('🔍 DEBUG - CheckoutPage - Looking for shipping address in localStorage');
        const savedShippingAddress = localStorage.getItem('last_shipping_address');
        if (savedShippingAddress) {
          console.log('🔍 DEBUG - CheckoutPage - Found shipping address in localStorage:', savedShippingAddress);
          const shippingAddressObj = JSON.parse(savedShippingAddress);

          // Ensure the shipping address is properly formatted with line1 instead of street
          shippingAddress = {
            name: shippingAddressObj.name,
            line1: shippingAddressObj.address.line1,
            line2: shippingAddressObj.address.line2 || null,
            city: shippingAddressObj.address.city,
            state: shippingAddressObj.address.state,
            postal_code: shippingAddressObj.address.postal_code,
            country: shippingAddressObj.address.country,
            phone: shippingAddressObj.phone,
            email: shippingAddressObj.email || null
          };

          // Make sure we're not using the street field
          if (!shippingAddress.line1 && shippingAddressObj.address.street) {
            shippingAddress.line1 = shippingAddressObj.address.street;
            console.log('🔍 DEBUG - CheckoutPage - Converted street to line1:', shippingAddressObj.address.street);
          }

          console.log('🔍 DEBUG - CheckoutPage - Processed shipping address:', JSON.stringify(shippingAddress, null, 2));

          // Clear localStorage after using it
          localStorage.removeItem('last_shipping_address');
          console.log('🔍 DEBUG - CheckoutPage - Cleared shipping address from localStorage');
        } else {
          console.log('🔍 DEBUG - CheckoutPage - No shipping address found in localStorage');
        }
      } catch (error) {
        console.error('🔍 DEBUG - CheckoutPage - Error parsing shipping address from localStorage:', error);
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      const customUser = localStorage.getItem('user');
      const isGuestUser = !user && !customUser;

      if (isGuestUser) {
        console.log('Creating guest order for payment intent:', paymentIntentId);

        // For guest users, we need to use a valid UUID that exists in the users table
        // Use a fixed guest user ID that we've created in the database
        const guestUuid = '00000000-0000-0000-0000-000000000001';

        // Create a customer ID for the guest user
        const guestCustomerId = `cus_guest_${Date.now().toString(36).substring(0, 8)}`;

        // Log the shipping address for debugging
        console.log('Guest order shipping address:', shippingAddress);

        // Create order data
        const orderData = {
          user_id: guestUuid, // Use a valid UUID
          customer_id: guestCustomerId,
          payment_intent_id: paymentIntentId,
          amount_total: Math.round(totalAmount * 100), // Convert to cents
          currency: 'usd',
          payment_status: 'succeeded',
          status: 'completed',
          items: items,
          shipping_cost: Math.round(shipping * 100), // Add shipping cost in cents
          discount_amount: Math.round(orderDiscount * 100), // Add discount in cents (exact amount, no rounding)
          discount_type: promoCodeValid ? discount.type : null,
          promo_code: promoCodeValid ? promoCode : null,
          shipping_address: shippingAddress,
          discount_percentage: promoCodeValid && discount.type === 'percentage' ?
            parseInt(discount.amount.toString()) : null,
          is_guest: true, // This is the key flag that identifies a guest order
          customer_email: shippingAddress?.email || null
        };

        console.log('Creating guest order with data:', JSON.stringify(orderData, null, 2));

        // Create the order directly in the database
        const { data: order, error } = await supabase
          .from('stripe_orders')
          .insert(orderData)
          .select();

        if (error) {
          console.error('Error creating guest order:', error);

          // Try a different approach with RPC
          try {
            console.log('Trying RPC approach for guest order');
            const { error: rpcError } = await supabase.rpc('create_guest_order', {
              order_data: orderData
            });

            if (rpcError) {
              console.error('RPC approach also failed:', rpcError);
            } else {
              console.log('Successfully created guest order via RPC');
            }
          } catch (rpcError) {
            console.error('Exception in RPC approach:', rpcError);
          }
        } else {
          console.log('Successfully created guest order:', order);
        }
      } else {
        console.log('Creating authenticated user order in the database');

        if (!user) {
          console.error('No authenticated user found');
          navigate("/checkout/success?payment_intent_id=" + paymentIntentId);
          return;
        }

        // Create the order directly in the database for authenticated user
        const { data: order, error } = await supabase
          .from('stripe_orders')
          .insert({
            user_id: user.id,
            customer_id: `cus_${user.id.substring(0, 8)}`,
            payment_intent_id: paymentIntentId,
            amount_total: Math.round(totalAmount * 100), // Convert to cents
            currency: 'usd',
            payment_status: 'succeeded',
            status: 'completed',
            items: items,
            shipping_cost: Math.round(shipping * 100), // Add shipping cost in cents
            discount_amount: orderDiscount * 100, // Add discount in cents (exact amount, no rounding)
            discount_type: promoCodeValid ? discount.type : null,
            promo_code: promoCodeValid ? promoCode : null,
            shipping_address: shippingAddress,
            discount_percentage: promoCodeValid && discount.type === 'percentage' ?
              parseInt(discount.amount.toString()) : null,
            is_guest: false
          })
          .select();

        if (error) {
          console.error('Error creating order directly:', error);

          // Try a fallback approach
          console.log('Trying fallback approach with createOrderFromPaymentIntent');
          const fallbackOrder = await createOrderFromPaymentIntent(
            paymentIntentId,
            totalAmount,
            items
          );

          if (fallbackOrder) {
            console.log('Order created with fallback approach:', fallbackOrder);
          } else {
            console.error('Both direct and fallback approaches failed');
          }
        } else {
          console.log('Order created successfully:', order);
        }
      }

      // Clear the cart
      dispatch({ type: 'SET_CART', payload: [] });

      // Navigate to success page with the payment intent ID
      // For guest users, add a guest=true parameter
      if (isGuestUser) {
        console.log('Guest checkout detected, navigating to success page with guest=true parameter');
        navigate(`/checkout/success?payment_intent_id=${paymentIntentId}&guest=true`);
      } else {
        navigate(`/checkout/success?payment_intent_id=${paymentIntentId}`);
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
      // Still navigate to success page even if order creation fails
      // Check if this is a guest user
      const { data: { user } } = await supabase.auth.getUser();
      const customUser = localStorage.getItem('user');
      const isGuestUser = !user && !customUser;

      if (isGuestUser) {
        console.log('Guest checkout detected in error handler, navigating to success page with guest=true parameter');
        navigate(`/checkout/success?payment_intent_id=${paymentIntentId}&guest=true`);
      } else {
        navigate(`/checkout/success?payment_intent_id=${paymentIntentId}`);
      }
    }
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-black mb-8"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          {/* Cart Items */}
          <div className="lg:col-span-7">
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <div className="mt-8">
              <div className="flow-root">
                <ul className="divide-y divide-gray-200">
                  {state.items.map((item) => (
                    <li key={item.productId} className="py-6 flex">
                      <div className="flex-shrink-0 w-24 h-24 rounded-md overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="ml-4 flex-1 flex flex-col">
                        <div>
                          <div className="flex justify-between text-base font-medium text-gray-900">
                            <h3>{item.title}</h3>
                            <p className="ml-4">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            Size: {item.size} • Color: {item.color}
                          </p>
                          {item.personalizationText && (
                            <div className="mt-1 text-sm text-gray-500 italic overflow-hidden">
                              <div className="break-words whitespace-pre-wrap" style={{ wordBreak: 'break-all', maxWidth: '100%' }}>
                                "{item.personalizationText}"
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex items-end justify-between text-sm mt-4">
                          <div className="flex items-center">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 rounded-md hover:bg-gray-100"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4 text-gray-500" />
                            </button>
                            <span className="mx-2 text-gray-700 font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 rounded-md hover:bg-gray-100"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                          <button
                            onClick={() => updateQuantity(item.id, 0)}
                            className="text-red-600 hover:text-red-800 flex items-center"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-16 lg:mt-0 lg:col-span-5">
            <div className="bg-white rounded-lg shadow-sm px-6 py-6">
              {!paymentIntent ? (
                <>
                  <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="text-sm font-medium text-gray-900">${subtotal.toFixed(2)}</p>
                    </div>

                    {promoCodeValid && discountAmount > 0 && (
                      <div className="flex items-center justify-between text-green-600">
                        <p className="text-sm flex items-center">
                          <Check className="w-4 h-4 mr-1" />
                          Discount {discount.type === 'percentage' ? `(${discount.amount}%)` : ''}
                        </p>
                        <p className="text-sm font-medium">-${discountAmount.toFixed(2)}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Shipping</p>
                      <p className="text-sm font-medium text-gray-900">${shipping.toFixed(2)}</p>
                    </div>

                    <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                      <p className="text-base font-medium text-gray-900">Order total</p>
                      <p className="text-base font-medium text-gray-900">${finalTotal.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Promo Code Input */}
                  <div className="mt-4">
                    <label htmlFor="promo-code" className="block text-sm font-medium text-gray-700">
                      Promo Code
                    </label>
                    <div className="mt-1 flex space-x-2">
                      <input
                        type="text"
                        id="promo-code"
                        name="promo-code"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value);
                          // Reset validation when user types
                          if (promoCodeValid) {
                            setPromoCodeValid(false);
                            setDiscount({ type: '', amount: 0 });
                          }
                        }}
                        className={`shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md ${promoCodeValid ? 'border-green-500' : promoMessage && !promoCodeValid ? 'border-red-500' : ''
                          }`}
                        placeholder="Enter promo code"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromoCode}
                        disabled={isValidatingPromo || !promoCode.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isValidatingPromo ? (
                          <Loader className="animate-spin h-4 w-4" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>

                    {promoMessage && (
                      <p className={`mt-1 text-xs ${promoCodeValid ? 'text-green-600' : 'text-red-600'}`}>
                        {promoCodeValid ? (
                          <span className="flex items-center">
                            <Check className="w-3 h-3 mr-1" />
                            {promoMessage}
                          </span>
                        ) : (
                          <span className="flex items-center">
                            {promoMessage !== 'Please enter a promo code' && (
                              <X className="w-3 h-3 mr-1" />
                            )}
                            {promoMessage}
                          </span>
                        )}
                      </p>
                    )}

                    {!promoMessage && (
                      <p className="mt-1 text-xs text-gray-500">
                        Enter a promo code if you have one. It will be applied before payment.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="mt-6 w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Proceed to Payment
                      </>
                    )}
                  </button>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                      Secure payment powered by Stripe
                    </p>
                  </div>
                </>
              ) : (
                <div className="w-full">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Complete Your Payment</h2>
                  <div className="w-full border border-gray-200 rounded-md overflow-hidden bg-white p-6">
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Subtotal</p>
                        <p className="text-sm font-medium text-gray-900">${subtotal.toFixed(2)}</p>
                      </div>

                      {promoCodeValid && discountAmount > 0 && (
                        <div className="flex items-center justify-between text-green-600">
                          <p className="text-sm flex items-center">
                            <Check className="w-4 h-4 mr-1" />
                            Discount {discount.type === 'percentage' ? `(${discount.amount}%)` : ''}
                          </p>
                          <p className="text-sm font-medium">-${discountAmount.toFixed(2)}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Shipping</p>
                        <p className="text-sm font-medium text-gray-900">${shipping.toFixed(2)}</p>
                      </div>

                      <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                        <p className="text-base font-medium text-gray-900">Order total</p>
                        <p className="text-base font-medium text-gray-900">${finalTotal.toFixed(2)}</p>
                      </div>
                    </div>

                    <StripeCheckoutWrapper
                      clientSecret={paymentIntent.clientSecret}
                      onSuccess={handlePaymentSuccess}
                      onCancel={() => setPaymentIntent(null)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};