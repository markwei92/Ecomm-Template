import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';

interface Order {
  id: string;
  payment_intent_id: string;
  amount_total: number;
  shipping_cost: number;
  discount_amount?: number;
  discount_type?: string;
  discount_percentage?: number;
  promo_code?: string;
  items: Array<{
    title: string;
    price: number;
    quantity: number;
    color?: string;
    size?: string;
    image?: string;
    personalizationText?: string;
  }>;
  shipping_address?: {
    name: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  created_at: string;
  currency: string;
  payment_status: string;
  is_guest?: boolean;
}

export const CheckoutSuccessPage: React.FC = () => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuestOrder, setIsGuestOrder] = useState(false);
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const paymentIntentId = searchParams.get('payment_intent_id');
  const isGuest = searchParams.get('guest') === 'true';

  // If guest parameter is present, set isGuestOrder immediately
  useEffect(() => {
    if (isGuest) {
      console.log('Guest parameter detected in URL, setting isGuestOrder to true');
      setIsGuestOrder(true);
    }
  }, [isGuest]);

  useEffect(() => {
    // Center the success message in the viewport
    const centerSuccessMessage = () => {
      const successCard = document.querySelector('.success-card');
      if (successCard) {
        // Calculate the position to center the card
        const cardRect = successCard.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const scrollPosition = cardRect.top + window.scrollY - (windowHeight / 2) + (cardRect.height / 2);

        // Smooth scroll to the calculated position
        window.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    };

    const fetchLatestOrder = async () => {
      try {
        // Check for shipping address in storage
        console.log('🚨 SUCCESS PAGE - Checking for shipping address in storage');
        const savedShippingAddress = localStorage.getItem('last_shipping_address') ||
          sessionStorage.getItem('last_shipping_address') ||
          localStorage.getItem('current_shipping_address') ||
          sessionStorage.getItem('current_shipping_address');

        if (savedShippingAddress) {
          console.log('🚨 SUCCESS PAGE - Found shipping address in storage:', savedShippingAddress);
        } else {
          console.log('🚨 SUCCESS PAGE - No shipping address found in storage');
        }

        // First, let's check the most recent order with ALL fields
        console.log('🔍 SUCCESS PAGE - Checking most recent order with all fields...');
        const { data: recentOrderData, error: recentOrderError } = await supabase
          .from('stripe_orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (recentOrderError) {
          console.error('🔍 SUCCESS PAGE - Error fetching recent order:', recentOrderError);
        } else {
          console.log('🔍 SUCCESS PAGE - Most recent order in database:', recentOrderData);
        }

        // First, check if there are any orders in the database
        const { data: allOrders, error: allOrdersError } = await supabase
          .from('stripe_orders')
          .select('*')
          .limit(10);

        if (allOrdersError) {
          console.error('Error querying all orders:', allOrdersError);
        } else {
          console.log('All orders in the database:', allOrders);

          if (allOrders && allOrders.length > 0) {
            console.log('Sample order data:', allOrders[0]);
          } else {
            console.log('No orders found in the database at all');
          }
        }

        // Try multiple times to find the order by payment intent ID
        let orders = null;
        let attempts = 0;
        const maxAttempts = 5;

        if (paymentIntentId) {
          console.log('🔍 SUCCESS PAGE - Fetching order by payment intent ID:', paymentIntentId);

          while (attempts < maxAttempts && (!orders || orders.length === 0)) {
            attempts++;
            console.log(`🔍 SUCCESS PAGE - Attempt ${attempts} to find order`);

            // Wait a bit longer for each attempt
            await new Promise(resolve => setTimeout(resolve, attempts * 1000));

            const { data, error } = await supabase
              .from('stripe_orders')
              .select('*')
              .eq('payment_intent_id', paymentIntentId)
              .order('created_at', { ascending: false })
              .limit(1);

            if (error) {
              console.error(`🔍 SUCCESS PAGE - Attempt ${attempts} error:`, error);
            } else {
              orders = data;
              console.log(`🔍 SUCCESS PAGE - Attempt ${attempts} result:`, orders);

              if (orders && orders.length > 0) {
                console.log('🔍 SUCCESS PAGE - Found order on attempt', attempts);
                break;
              }
            }
          }

          // If still no order found, this is a problem
          if (!orders || orders.length === 0) {
            console.error('🔍 SUCCESS PAGE - CRITICAL: No order found after all attempts for payment intent:', paymentIntentId);

            // As a last resort, get the most recent order for debugging
            const { data: debugOrders } = await supabase
              .from('stripe_orders')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(3);

            console.log('🔍 SUCCESS PAGE - Most recent orders for debugging:', debugOrders);
          }
        }

        if (orders && orders.length > 0) {
          const currentOrder = orders[0];

          // Log ALL order information for debugging
          console.log('🔍 SUCCESS PAGE - Complete order data:', currentOrder);

          // Log discount information for debugging
          console.log('🔍 SUCCESS PAGE - Order found with discount info:', {
            discount_amount: currentOrder.discount_amount,
            discount_type: currentOrder.discount_type,
            discount_percentage: currentOrder.discount_percentage,
            promo_code: currentOrder.promo_code,
            amount_total: currentOrder.amount_total,
            shipping_cost: currentOrder.shipping_cost,
            items: currentOrder.items
          });

          setOrder(currentOrder);

          // Check if this is a guest order using the is_guest flag
          if (isGuest || currentOrder.is_guest === true) {
            console.log('This is a guest order');
            setIsGuestOrder(true);
          }

          // Check if we need to update the shipping address
          if (!currentOrder.shipping_address || Object.keys(currentOrder.shipping_address).length === 0) {
            console.log('🚨 SUCCESS PAGE - Order has no shipping address');

            let shippingAddressToSave = null;

            // Try to get shipping address from storage
            if (savedShippingAddress) {
              console.log('🚨 SUCCESS PAGE - Found shipping address in storage, updating order');

              try {
                const shippingAddressObj = JSON.parse(savedShippingAddress);

                // Create shipping address object
                shippingAddressToSave = {
                  name: shippingAddressObj.name,
                  line1: shippingAddressObj.address.line1,
                  line2: shippingAddressObj.address.line2 || null,
                  city: shippingAddressObj.address.city,
                  state: shippingAddressObj.address.state,
                  postal_code: shippingAddressObj.address.postal_code,
                  country: shippingAddressObj.address.country,
                  phone: shippingAddressObj.phone
                };
              } catch (error) {
                console.error('🚨 SUCCESS PAGE - Error parsing shipping address:', error);
              }
            } else {
              console.log('🚨 SUCCESS PAGE - No shipping address in storage, trying to get default address');

              // Try to get the user's default address as a last resort
              try {
                // Get user's default shipping address
                const { data: addresses } = await supabase
                  .from('addresses')
                  .select('*')
                  .eq('is_default', true)
                  .limit(1);

                if (addresses && addresses.length > 0) {
                  const defaultAddress = addresses[0];
                  console.log('🚨 SUCCESS PAGE - Found default address:', defaultAddress);

                  // Get user profile for name
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, phone')
                    .single();

                  if (profile) {
                    // Create a shipping address from the default address
                    shippingAddressToSave = {
                      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
                      line1: defaultAddress.street,
                      line2: null,
                      city: defaultAddress.city,
                      state: defaultAddress.state,
                      postal_code: defaultAddress.postal_code,
                      country: defaultAddress.country,
                      phone: profile.phone || ''
                    };

                    console.log('🚨 SUCCESS PAGE - Created address from default:', shippingAddressToSave);
                  }
                }
              } catch (fallbackError) {
                console.error('🚨 SUCCESS PAGE - Error getting fallback address:', fallbackError);
              }
            }

            // If we have a shipping address to save, update the order
            if (shippingAddressToSave) {
              console.log('🚨 SUCCESS PAGE - Updating order with shipping address:', JSON.stringify(shippingAddressToSave, null, 2));

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
                  console.log('🚨 SUCCESS PAGE - Fetched shipping config:', shippingConfig);
                }
              } catch (error) {
                console.error('🚨 SUCCESS PAGE - Error fetching shipping config:', error);
              }

              // Calculate total quantity for shipping cost
              const totalQuantity = currentOrder.items ? currentOrder.items.reduce((sum, item) => sum + item.quantity, 0) : 1;

              // Calculate shipping cost based on quantity and configuration
              let shippingCost = shippingConfig.base_shipping_cost;
              if (totalQuantity > 1) {
                shippingCost = shippingConfig.base_shipping_cost + ((totalQuantity - 1) * shippingConfig.additional_item_cost);
              }
              console.log(`🚨 SUCCESS PAGE - Calculated shipping cost: $${shippingCost / 100} for ${totalQuantity} items`);

              // Update the order with the shipping address
              const { error: updateError } = await supabase
                .from('stripe_orders')
                .update({
                  shipping_address: shippingAddressToSave,
                  shipping_cost: shippingCost,
                  updated_at: new Date().toISOString()
                })
                .eq('id', currentOrder.id);

              if (updateError) {
                console.error('🚨 SUCCESS PAGE - Error updating order with shipping address:', updateError);

                // Try a second approach with RPC
                try {
                  const jsonString = JSON.stringify(shippingAddressToSave).replace(/'/g, "''");
                  const { error: rpcError } = await supabase.rpc('execute_sql', {
                    sql_query: `UPDATE stripe_orders
                                SET shipping_address = '${jsonString}'::jsonb,
                                    shipping_cost = ${shippingCost},
                                    updated_at = '${new Date().toISOString()}'
                                WHERE id = '${currentOrder.id}'`
                  });

                  if (rpcError) {
                    console.error('🚨 SUCCESS PAGE - Error with RPC update:', rpcError);
                  } else {
                    console.log('🚨 SUCCESS PAGE - Successfully updated order with RPC');

                    // Update the local order object with the shipping address
                    currentOrder.shipping_address = shippingAddressToSave;
                    currentOrder.shipping_cost = shippingCost;
                    setOrder({ ...currentOrder });
                  }
                } catch (rpcException) {
                  console.error('🚨 SUCCESS PAGE - Exception with RPC update:', rpcException);
                }
              } else {
                console.log('🚨 SUCCESS PAGE - Successfully updated order with shipping address');

                // Update the local order object with the shipping address
                currentOrder.shipping_address = shippingAddressToSave;
                currentOrder.shipping_cost = shippingCost;
                setOrder({ ...currentOrder });
              }

              // Clear all storage
              localStorage.removeItem('last_shipping_address');
              sessionStorage.removeItem('last_shipping_address');
              localStorage.removeItem('current_shipping_address');
              sessionStorage.removeItem('current_shipping_address');
              console.log('🚨 SUCCESS PAGE - Cleared all shipping addresses from storage');
            }
          }

          // Clear the cart after successful order
          dispatch({ type: 'SET_CART', payload: [] });
        } else {
          console.log('No orders found with the provided parameters');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setIsLoading(false);

        // Center the success message after a short delay to ensure the DOM is updated
        setTimeout(centerSuccessMessage, 300);
      }
    };

    fetchLatestOrder();
  }, [paymentIntentId, dispatch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="success-card bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center max-w-md mx-auto">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          {order ? (
            <>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Thank you for your purchase!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Your order has been successfully processed.
              </p>
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                {/* Order Items - Moved to the top */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Order Items:</p>
                  <div className="space-y-3">
                    {(() => {
                      // Handle both old format (items array) and new format (items object with discount_info)
                      const itemsData = order.items;
                      const actualItems = Array.isArray(itemsData) ? itemsData : (itemsData?.items || []);

                      return actualItems && actualItems.length > 0 ? (
                        actualItems.map((item, index) => (
                          <div key={index} className="flex items-start space-x-3 text-left">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{item.title}</p>
                              <div className="text-xs text-gray-500">
                                <span>Qty: {item.quantity}</span>
                                {item.color && <span> • Color: {item.color}</span>}
                                {item.size && <span> • Size: {item.size}</span>}
                              </div>
                              <p className="text-sm">${item.price.toFixed(2)} each</p>
                              {item.personalizationText && (
                                <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                                  <span className="font-medium">Personalization: </span>
                                  <div className="text-gray-700 break-words whitespace-pre-wrap overflow-hidden max-w-full" style={{ wordBreak: 'break-all' }}>
                                    {item.personalizationText}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No item details available</p>
                      );
                    })()}
                  </div>
                </div>

                {/* Order Summary - Moved below items */}
                <div className="border-t border-gray-200 pt-4">
                  {(() => {
                    // Handle both old format (items array) and new format (items object with discount_info)
                    const itemsData = order.items;
                    const actualItems = Array.isArray(itemsData) ? itemsData : (itemsData?.items || []);
                    const discountInfo = Array.isArray(itemsData) ? null : itemsData?.discount_info;

                    // Calculate subtotal from items
                    const calculatedSubtotal = actualItems && actualItems.length > 0
                      ? parseFloat(actualItems.reduce((sum, item) =>
                        sum + (parseFloat(item.price) * item.quantity), 0).toFixed(2))
                      : ((order.amount_total - (order.shipping_cost || 0) + (order.discount_amount || 0)) / 100);

                    // Get discount amount from either the old columns or the embedded discount_info
                    const discountAmount = (
                      order.discount_amount ||
                      discountInfo?.discount_amount ||
                      0
                    ) / 100;

                    // Calculate shipping cost
                    const shippingCost = (order.shipping_cost || 0) / 100;

                    // Calculate total
                    const calculatedTotal = calculatedSubtotal - discountAmount + shippingCost;

                    // Log for debugging
                    console.log('🔍 SUCCESS PAGE - Order calculations:', {
                      calculatedSubtotal,
                      discountAmount,
                      shippingCost,
                      calculatedTotal,
                      storedTotal: (order.amount_total || 0) / 100,
                      discount_info: {
                        discount_amount: order.discount_amount,
                        discount_type: order.discount_type,
                        discount_percentage: order.discount_percentage,
                        promo_code: order.promo_code
                      }
                    });

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">Subtotal</p>
                          <p className="text-sm font-medium text-gray-900">
                            ${calculatedSubtotal.toFixed(2)}
                          </p>
                        </div>

                        {/* Always display discount row */}
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm text-gray-600">Discount</p>
                          <p className="text-sm font-medium text-green-600">
                            {discountAmount > 0 ? (
                              (order.discount_type || discountInfo?.discount_type) === 'percentage' && (order.discount_percentage || discountInfo?.discount_percentage) ?
                                `(${order.discount_percentage || discountInfo?.discount_percentage}%) -$${discountAmount.toFixed(2)}` :
                                `-$${discountAmount.toFixed(2)}`
                            ) : '$0.00'}
                          </p>
                        </div>

                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm text-gray-600">Shipping</p>
                          <p className="text-sm font-medium text-gray-900">
                            ${shippingCost.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700">Order Total</p>
                          <p className="text-xl font-bold text-gray-900">
                            ${calculatedTotal.toFixed(2)}
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  <p className="text-xs text-gray-500 mt-2">
                    Order ID: {order.id}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Thank you for your purchase!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Your payment has been successfully processed.
              </p>
              <p className="mt-4 text-gray-600">
                {paymentIntentId ?
                  `Payment ID: ${paymentIntentId}` :
                  "Your order details will be available soon."}
              </p>
            </>
          )}
          {!isGuestOrder ? (
            <div className="mt-6">
              <Link
                to="/account?tab=orders"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                View Your Orders
              </Link>
            </div>
          ) : (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-4">
                Your order has been confirmed. An email will be sent to you shortly.
              </p>
            </div>
          )}
          <div className="mt-4">
            <Link
              to="/products"
              className="text-sm font-medium text-black hover:text-gray-900"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
