import React, { useState, useEffect } from 'react';
import { User, MapPin, CreditCard, Package, LogOut, Plus, ShoppingCart, Minus, Trash2, Star } from 'lucide-react';
import { Tab } from '@headlessui/react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ProfileForm } from '../components/ProfileForm';
import { AddressForm } from '../components/AddressForm';
import { PaymentMethodForm } from '../components/PaymentMethodForm';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { ReviewModal } from '../components/ReviewModal';
import { hasUserReviewedProduct } from '../services/reviewService';
import { toast } from 'react-toastify';

// Add countries list
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde",
  "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia",
  "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea",
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

interface AccountDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export const AccountPage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<string>('');
  const [reviewOrderId, setReviewOrderId] = useState<string>('');
  const [reviewProductTitle, setReviewProductTitle] = useState<string>('');
  const [reviewProductImage, setReviewProductImage] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { state: cartState, dispatch } = useCart();
  const [accountDetails, setAccountDetails] = useState<AccountDetails>({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    id: '',
    lastFour: ''
  });

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      console.log('🔄 REFRESH - Fetching orders for user...');

      // Get the current user ID
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔄 REFRESH - Current user:', user?.id);

      if (!user) {
        console.log('🔄 REFRESH - No authenticated user found');
        setOrdersLoading(false);
        return;
      }

      // Force update shipping addresses for all recent orders
      try {
        console.log('🔄 REFRESH - Checking for recent orders with shipping addresses...');

        // Get the most recent order
        const { data: recentOrder, error: recentOrderError } = await supabase
          .from('stripe_orders')
          .select('id, payment_intent_id, shipping_address')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recentOrderError) {
          console.error('🔄 REFRESH - Error finding recent order:', recentOrderError);
        } else if (recentOrder && recentOrder.shipping_address) {
          console.log('🔄 REFRESH - Found recent order with shipping address:', recentOrder.id);
          console.log('🔄 REFRESH - Shipping address:', JSON.stringify(recentOrder.shipping_address, null, 2));

          // Call the update-shipping-address function to force update all orders
          try {
            console.log('🔄 REFRESH - Calling update-shipping-address function...');
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-shipping-address`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                paymentIntentId: recentOrder.payment_intent_id,
                shippingAddress: recentOrder.shipping_address
              })
            });

            const result = await response.json();
            console.log('🔄 REFRESH - Update shipping address result:', result);
          } catch (updateError) {
            console.error('🔄 REFRESH - Error calling update-shipping-address:', updateError);
          }
        } else {
          console.log('🔄 REFRESH - No recent order with shipping address found');
        }
      } catch (forceUpdateError) {
        console.error('🔄 REFRESH - Error force updating shipping addresses:', forceUpdateError);
      }

      // First, let's check if the table exists and has any data
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
          console.log('User IDs in orders:', allOrders.map(order => order.user_id));
        } else {
          console.log('No orders found in the database at all');
        }
      }

      // Remove test shipping addresses from existing orders
      try {
        console.log('🔍 DEBUG - Checking for orders with test shipping addresses...');

        // Find orders with test shipping addresses for this user
        const { data: testOrders, error: testOrdersError } = await supabase
          .from('stripe_orders')
          .select('id, shipping_address')
          .eq('user_id', user.id)
          .filter('shipping_address->name', 'ilike', '%TEST DATA%');

        if (testOrdersError) {
          console.error('🔍 DEBUG - Error finding test orders:', testOrdersError);
        } else if (testOrders && testOrders.length > 0) {
          console.log('🔍 DEBUG - Found orders with test shipping addresses:', testOrders.length);
          console.log('🔍 DEBUG - Test orders:', testOrders);

          // Remove test shipping addresses
          for (const order of testOrders) {
            console.log(`🔍 DEBUG - Removing test shipping address from order ${order.id}`);

            const { error: updateError } = await supabase
              .from('stripe_orders')
              .update({ shipping_address: null })
              .eq('id', order.id);

            if (updateError) {
              console.error(`🔍 DEBUG - Error removing test shipping address from order ${order.id}:`, updateError);
            } else {
              console.log(`🔍 DEBUG - Successfully removed test shipping address from order ${order.id}`);
            }
          }
        } else {
          console.log('🔍 DEBUG - No orders with test shipping addresses found for this user');
        }
      } catch (error) {
        console.error('🔍 DEBUG - Error removing test shipping addresses:', error);
      }

      // Now query for the user's orders
      console.log(`Querying for orders with user_id = ${user.id}`);
      const { data: orderData, error } = await supabase
        .from('stripe_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // If shipping_status column doesn't exist, try to add it
      try {
        // Try to ensure the shipping_status column exists
        const { error: alterError } = await supabase.rpc('execute_sql', {
          sql_query: "ALTER TABLE IF EXISTS public.stripe_orders ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'Order Sent'"
        });

        if (alterError) {
          console.warn('Could not add shipping_status column:', alterError);
        }

        // Ensure discount_amount column exists
        const { error: discountError } = await supabase.rpc('execute_sql', {
          sql_query: "ALTER TABLE IF EXISTS public.stripe_orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0"
        });

        if (discountError) {
          console.warn('Could not add discount_amount column:', discountError);
        }

        // Ensure discount_type column exists
        const { error: discountTypeError } = await supabase.rpc('execute_sql', {
          sql_query: "ALTER TABLE IF EXISTS public.stripe_orders ADD COLUMN IF NOT EXISTS discount_type TEXT"
        });

        if (discountTypeError) {
          console.warn('Could not add discount_type column:', discountTypeError);
        }

        // Ensure discount_percentage column exists
        const { error: discountPercentageError } = await supabase.rpc('execute_sql', {
          sql_query: "ALTER TABLE IF EXISTS public.stripe_orders ADD COLUMN IF NOT EXISTS discount_percentage INTEGER"
        });

        if (discountPercentageError) {
          console.warn('Could not add discount_percentage column:', discountPercentageError);
        }

        // Ensure shipping_address column exists
        const { error: shippingAddressError } = await supabase.rpc('execute_sql', {
          sql_query: "ALTER TABLE IF EXISTS public.stripe_orders ADD COLUMN IF NOT EXISTS shipping_address JSONB"
        });

        if (shippingAddressError) {
          console.warn('Could not add shipping_address column:', shippingAddressError);
        }
      } catch (columnError) {
        console.warn('Error ensuring columns exist:', columnError);
      }

      if (error) {
        console.error('🔍 DEBUG - Error fetching orders:', error);
        setOrders([]);
      } else {
        console.log('🔍 DEBUG - Orders found for this user:', orderData?.length || 0);
        if (orderData && orderData.length > 0) {
          console.log('🔍 DEBUG - User order data:', orderData);

          // Log shipping addresses for debugging
          orderData.forEach(order => {
            console.log(`🔍 DEBUG - Order ${order.id} shipping address:`, order.shipping_address);

            // Add more detailed logging for shipping address
            if (order.shipping_address) {
              console.log(`🔍 DEBUG - Order ${order.id} shipping address details:`, {
                name: order.shipping_address.name,
                line1: order.shipping_address.line1,
                street: order.shipping_address.street,
                city: order.shipping_address.city,
                state: order.shipping_address.state,
                postal_code: order.shipping_address.postal_code,
                country: order.shipping_address.country,
                phone: order.shipping_address.phone
              });
            }
          });

          // Process orders to ensure they have the correct discount information
          const processedOrders = await Promise.all(orderData.map(async order => {
            let updatedOrder = { ...order };
            let needsUpdate = false;

            // Log order details for debugging
            console.log(`🚨 ORDER ${order.id} - Processing order:`, {
              amount_total: order.amount_total,
              discount_amount: order.discount_amount,
              discount_type: order.discount_type,
              discount_percentage: order.discount_percentage,
              promo_code: order.promo_code,
              shipping_cost: order.shipping_cost
            });

            // Calculate what the total should be
            const calculatedSubtotal = order.items && order.items.length > 0
              ? parseFloat(order.items.reduce((sum, item) =>
                sum + (parseFloat(item.price) * item.quantity), 0).toFixed(2))
              : ((order.amount_total - (order.shipping_cost || 0) + (order.discount_amount || 0)) / 100);

            const discountAmount = (order.discount_amount || 0) / 100;
            const shippingCost = (order.shipping_cost || 0) / 100;
            const calculatedTotal = calculatedSubtotal - discountAmount + shippingCost;

            console.log(`🚨 ORDER ${order.id} - Calculated values:`, {
              calculatedSubtotal,
              discountAmount,
              shippingCost,
              calculatedTotal,
              storedTotal: (order.amount_total || 0) / 100
            });

            // If order has discount field (old format) but not discount_amount
            if (order.discount && !order.discount_amount) {
              console.log(`🚨 ORDER ${order.id} - Converting old discount format to new format`);
              updatedOrder = {
                ...updatedOrder,
                discount_amount: order.discount,
                // If no discount_type, assume percentage and calculate it
                discount_percentage: order.discount_type === 'percentage' ?
                  order.discount_percentage :
                  order.items && order.items.length > 0 ?
                    Math.round((order.discount / (parseFloat(order.items[0].price) * order.items[0].quantity * 100)) * 100) :
                    10 // Default to 10% if we can't calculate
              };
            }

            // Check for promo code TEST10 specifically
            if (updatedOrder.promo_code === 'TEST10' && updatedOrder.items && updatedOrder.items.length > 0) {
              console.log(`🚨 ORDER ${order.id} - Found TEST10 promo code, ensuring 10% discount is applied`);

              // Calculate what the subtotal should be
              const calculatedSubtotal = updatedOrder.items.reduce((sum, item) =>
                sum + (parseFloat(item.price) * item.quantity * 100), 0);

              // Calculate 10% discount
              const expectedDiscount = Math.round((calculatedSubtotal * 10) / 100);

              console.log(`🚨 ORDER ${order.id} - TEST10 discount calculation:`, {
                calculatedSubtotal,
                expectedDiscount,
                currentDiscount: updatedOrder.discount_amount
              });

              // If discount is missing or incorrect, update it
              if (!updatedOrder.discount_amount || updatedOrder.discount_amount !== expectedDiscount) {
                console.log(`🚨 ORDER ${order.id} - Updating TEST10 discount from ${updatedOrder.discount_amount} to ${expectedDiscount}`);
                updatedOrder = {
                  ...updatedOrder,
                  discount_amount: expectedDiscount,
                  discount_type: 'percentage',
                  discount_percentage: 10
                };
                needsUpdate = true;
              }
            }
            // Only calculate discount if a promo code was actually applied but no discount amount is set
            // We check for promo_code field to determine if a discount was intentionally applied
            else if (!updatedOrder.discount_amount && updatedOrder.promo_code && updatedOrder.items && updatedOrder.items.length > 0) {
              console.log(`🚨 ORDER ${order.id} - Calculating missing discount for promo code: ${updatedOrder.promo_code}`);

              // Calculate what the total should be without discount
              const calculatedSubtotal = updatedOrder.items.reduce((sum, item) =>
                sum + (parseFloat(item.price) * item.quantity * 100), 0);

              // Add shipping cost
              const calculatedTotal = calculatedSubtotal + (updatedOrder.shipping_cost || 500);

              // Compare with actual total to find discount
              const actualTotal = updatedOrder.amount_total;
              const discrepancy = calculatedTotal - actualTotal;

              if (discrepancy > 0) {
                console.log(`🚨 ORDER ${order.id} - Found discrepancy of ${discrepancy} cents with promo code ${updatedOrder.promo_code}`);

                // Check for common discount percentages (10%, 20%, etc.)
                let discountPercentage = 0;

                // Try to match common discount percentages
                const commonPercentages = [10, 15, 20, 25, 30, 40, 50];
                for (const percentage of commonPercentages) {
                  const expectedDiscount = (calculatedSubtotal * percentage) / 100;
                  // Allow for small rounding differences (within 10 cents)
                  if (Math.abs(expectedDiscount - discrepancy) <= 10) {
                    discountPercentage = percentage;
                    console.log(`🚨 ORDER ${order.id} - Matched to common discount percentage: ${percentage}%`);
                    break;
                  }
                }

                // If no common percentage matched, calculate it precisely
                if (discountPercentage === 0) {
                  discountPercentage = Math.round((discrepancy / calculatedSubtotal) * 100);
                  console.log(`🚨 ORDER ${order.id} - Calculated custom discount percentage: ${discountPercentage}%`);
                }

                updatedOrder = {
                  ...updatedOrder,
                  discount_amount: discrepancy,
                  discount_type: 'percentage',
                  discount_percentage: discountPercentage
                };

                console.log(`🚨 ORDER ${order.id} - Calculated discount:`, {
                  discount_amount: updatedOrder.discount_amount,
                  discount_type: updatedOrder.discount_type,
                  discount_percentage: updatedOrder.discount_percentage
                });
              }
            } else if (!updatedOrder.promo_code && updatedOrder.discount_amount > 0) {
              // If there's no promo code but discount_amount exists, reset it to 0
              console.log(`🚨 ORDER ${order.id} - Removing incorrect discount - no promo code found`);
              updatedOrder = {
                ...updatedOrder,
                discount_amount: 0,
                discount_type: null,
                discount_percentage: null
              };
              needsUpdate = true;
            }

            // Log shipping address for debugging
            if (order.shipping_address) {
              console.log(`🚨 ORDER ${order.id} - Has shipping address:`, JSON.stringify(order.shipping_address, null, 2));

              // Check if it's the old format (with street) and needs to be converted to the new format (with line1)
              if (order.shipping_address.street && !order.shipping_address.line1) {
                console.log(`🚨 ORDER ${order.id} - Converting old shipping address format to new format`);

                // Create a new shipping address in the new format
                const newFormatAddress = {
                  name: `${accountDetails.firstName} ${accountDetails.lastName}`.trim(),
                  line1: order.shipping_address.street,
                  line2: null,
                  city: order.shipping_address.city,
                  state: order.shipping_address.state,
                  postal_code: order.shipping_address.postal_code,
                  country: order.shipping_address.country,
                  phone: accountDetails.phone || ''
                };

                // Update the order with the new format address
                updatedOrder = {
                  ...updatedOrder,
                  shipping_address: newFormatAddress
                };
              }
            } else {
              console.log(`🚨 ORDER ${order.id} - No shipping address found`);
            }

            // If we need to update the order in the database
            if (needsUpdate) {
              console.log(`🚨 ORDER ${order.id} - Updating order in database with corrected discount information`);
              try {
                // Update the order in the database
                const { error: updateError } = await supabase
                  .from('stripe_orders')
                  .update({
                    discount_amount: updatedOrder.discount_amount,
                    discount_type: updatedOrder.discount_type,
                    discount_percentage: updatedOrder.discount_percentage
                  })
                  .eq('id', order.id);

                if (updateError) {
                  console.error(`🚨 ORDER ${order.id} - Error updating order:`, updateError);
                } else {
                  console.log(`🚨 ORDER ${order.id} - Successfully updated order in database`);
                }
              } catch (error) {
                console.error(`🚨 ORDER ${order.id} - Exception updating order:`, error);
              }
            }

            return updatedOrder;
          }));

          setOrders(processedOrders);
        } else {
          setOrders([]);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // State to track the selected tab index
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  useEffect(() => {
    console.log('🔄 ACCOUNT PAGE - useEffect triggered, location:', location.pathname + location.search);

    // Check for tab parameter in URL
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');

    // Set the selected tab based on the URL parameter
    if (tabParam === 'orders') {
      setSelectedTabIndex(3); // Orders tab is at index 3
    } else if (tabParam === 'addresses') {
      setSelectedTabIndex(1); // Addresses tab is at index 1
    } else if (tabParam === 'cart') {
      setSelectedTabIndex(2); // Cart tab is at index 2
    } else {
      setSelectedTabIndex(0); // Default to Profile tab
    }

    fetchUserData();
    fetchAddresses();
    fetchPaymentMethod();

    // Force refresh orders every time the component mounts or location changes
    console.log('🔄 ACCOUNT PAGE - Force refreshing orders...');
    fetchOrders();

    // Set up real-time subscription for order status updates
    const setupOrderSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Subscribe to changes in the stripe_orders table for this user
        console.log('Setting up real-time subscription for order status updates');
        const channel = supabase.channel('order-status-changes-' + user.id);

        // First, get all the user's order IDs to set up specific filters
        const { data: userOrders, error: userOrdersError } = await supabase
          .from('stripe_orders')
          .select('id')
          .eq('user_id', user.id);

        if (userOrdersError) {
          console.error('Error fetching user orders for subscription setup:', userOrdersError);
        } else {
          console.log(`Found ${userOrders.length} orders for user ${user.id} to monitor for updates`);
        }

        const subscription = channel
          .on(
            'postgres_changes',
            {
              event: '*', // Listen for all events to ensure we catch all changes
              schema: 'public',
              table: 'stripe_orders',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('🔍 DEBUG - Order updated via real-time:', payload);

              // Log shipping address specifically
              if (payload.new.shipping_address) {
                console.log('🔍 DEBUG - Real-time update includes shipping address:',
                  JSON.stringify(payload.new.shipping_address, null, 2));
              } else {
                console.log('🔍 DEBUG - Real-time update does not include shipping address');
              }

              // Log shipping status specifically
              console.log('🔍 DEBUG - Real-time update shipping status:', {
                old_shipping_status: payload.old?.shipping_status,
                new_shipping_status: payload.new.shipping_status,
                old_updated_at: payload.old?.updated_at,
                new_updated_at: payload.new.updated_at
              });

              // Update the order in the local state
              setOrders(prevOrders => {
                const updatedOrders = prevOrders.map(order => {
                  if (order.id === payload.new.id) {
                    console.log(`🔍 DEBUG - Updating order ${order.id} in user dashboard:`, {
                      current_shipping_status: order.shipping_status,
                      new_shipping_status: payload.new.shipping_status
                    });

                    // Create updated order with new data
                    const updatedOrder = { ...order, ...payload.new };

                    console.log(`🔍 DEBUG - Order ${order.id} updated in user dashboard:`, {
                      final_shipping_status: updatedOrder.shipping_status
                    });

                    return updatedOrder;
                  }
                  return order;
                });

                // Check if any orders were actually updated
                const updatedOrderIds = updatedOrders
                  .filter((order, index) => order.id === payload.new.id && order !== prevOrders[index])
                  .map(order => order.id);

                if (updatedOrderIds.length > 0) {
                  console.log(`🔍 DEBUG - Orders updated in user dashboard: ${updatedOrderIds.join(', ')}`);

                  // Show a toast notification for shipping status changes
                  if (payload.old && payload.new && payload.old.shipping_status !== payload.new.shipping_status) {
                    toast.info(`Order status updated to: ${payload.new.shipping_status}`);
                  }
                } else {
                  console.log('🔍 DEBUG - No orders were updated in user dashboard');
                }

                return updatedOrders;
              });
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status);
          });

        console.log('Real-time subscription set up successfully');

        // Clean up subscription on unmount
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up order subscription:', error);
      }
    };

    setupOrderSubscription();
  }, [location.pathname, location.search]); // Add location as dependency to force refresh

  const fetchPaymentMethod = async () => {
    try {
      const { data: paymentMethods, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_default', true)
        .limit(1);

      if (error) throw error;

      if (paymentMethods && paymentMethods.length > 0) {
        const method = paymentMethods[0];
        setPaymentMethod({
          cardNumber: `•••• •••• •••• ${method.last_four}`,
          expiryDate: method.expiry_date,
          cvv: '•••',
          cardholderName: method.cardholder_name,
          id: method.id,
          lastFour: method.last_four
        });
        setIsEditingPayment(false);
      } else {
        // No payment method found, keep isEditingPayment as true
        setIsEditingPayment(true);
      }
    } catch (error) {
      console.error('Error fetching payment method:', error);
      setIsEditingPayment(true);
    }
  };

  const handleSavePaymentMethod = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      // Basic validation
      if (!paymentMethod.cardholderName || !paymentMethod.cardNumber || !paymentMethod.expiryDate || !paymentMethod.cvv) {
        throw new Error('Please fill in all payment fields');
      }

      // Extract last four digits
      const lastFour = paymentMethod.cardNumber.replace(/\D/g, '').slice(-4);

      // Save to database
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          cardholder_name: paymentMethod.cardholderName,
          last_four: lastFour,
          expiry_date: paymentMethod.expiryDate,
          is_default: true
        })
        .select()
        .single();

      if (error) throw error;

      // Update state
      setPaymentMethod(prev => ({
        ...prev,
        cardNumber: `•••• •••• •••• ${lastFour}`,
        cvv: '•••',
        lastFour
      }));
      setIsEditingPayment(false);
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      alert(error.message || 'Failed to save payment method');
    }
  };

  const fetchAddresses = async () => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('No authenticated user found for addresses');
        return;
      }

      const { data: addresses, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAddresses(addresses.map(addr => ({
        id: addr.id,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postal_code,
        country: addr.country,
        isDefault: addr.is_default
      })));
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      // Use our custom logout function
      const result = await logoutUser();

      if (result.success) {
        navigate('/login');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const { user: authUser, isCustomAuth } = useAuth();

  const fetchUserData = async () => {
    try {
      console.log('Fetching user data...');

      if (!authUser) {
        console.log('No authenticated user found, redirecting to login');
        navigate('/login', {
          replace: true,
          state: { from: location.pathname }
        });
        return;
      }

      setIsAuthenticated(true);

      if (isCustomAuth) {
        // For custom auth, use the user data from localStorage
        console.log('Using custom auth user data:', authUser);

        setAccountDetails({
          firstName: (authUser as any).firstName || '',
          lastName: (authUser as any).lastName || '',
          email: (authUser as any).email || '',
          phone: ''
        });
      } else {
        // For Supabase auth, get profile data from the database
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('Auth error:', authError);
          throw authError;
        }

        if (!user) {
          console.log('No user found, redirecting to login');
          navigate('/login', {
            replace: true,
            state: { from: location.pathname }
          });
          return;
        }

        // Get user profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        console.log('Profile data fetched:', profile);

        setAccountDetails({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: user.email || '',
          phone: profile.phone || ''
        });
      }
    } catch (error) {
      setIsAuthenticated(false);
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: accountDetails.firstName,
          last_name: accountDetails.lastName,
          phone: accountDetails.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<Address>({
    id: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  });
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleAccountChange = (field: keyof AccountDetails, value: string) => {
    setAccountDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (addressId: string, field: keyof Address, value: string) => {
    if (addressId === 'new') {
      setNewAddress(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      setAddresses(prev =>
        prev.map(addr =>
          addr.id === addressId ? { ...addr, [field]: value } : addr
        )
      );
    }
  };

  const handleEditAddress = (addressId: string) => {
    setEditingAddressId(addressId);
  };

  const handleCancelAddressEdit = () => {
    setEditingAddressId(null);
    setShowNewAddressForm(false);
  };

  const handleSaveAddress = async (addressId: string) => {
    if (addressId === 'new') {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');

        const { data, error } = await supabase
          .from('user_addresses')
          .insert({
            user_id: user.id,
            street: newAddress.street,
            city: newAddress.city,
            state: newAddress.state,
            postal_code: newAddress.postalCode,
            country: newAddress.country,
            is_default: addresses.length === 0 // Make default if first address
          })
          .select()
          .single();

        if (error) throw error;

        setAddresses(prev => [...prev, {
          id: data.id,
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postal_code,
          country: data.country,
          isDefault: data.is_default
        }]);
      } catch (error) {
        console.error('Error saving address:', error);
        return;
      }

      setShowNewAddressForm(false);
      setNewAddress({
        id: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      });
    }

    setEditingAddressId(null);
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      setAddresses(prev => prev.filter(addr => addr.id !== addressId));
    } catch (error) {
      console.error('Error deleting address:', error);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('No authenticated user');

      // Update all addresses to not be default for this user
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', addressId);

      // Set the selected address as default
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      setAddresses(prev =>
        prev.map(addr => ({
          ...addr,
          isDefault: addr.id === addressId
        }))
      );
    } catch (error) {
      console.error('Error setting default address:', error);
    }
  };

  // Function to handle opening the review modal
  const handleOpenReviewModal = async (orderId: string, itemId: string, productTitle: string, productImage?: string) => {
    try {
      console.log('Opening review modal for:', { orderId, itemId, productTitle });

      // First, try to find the product ID by title
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, title')
        .ilike('title', productTitle)
        .limit(1);

      if (productsError) {
        console.error('Error finding product by title:', productsError);
        toast.error('Could not find the product. Please try again.');
        return;
      }

      if (!products || products.length === 0) {
        console.error('No product found with title:', productTitle);
        toast.error('Product not found. Please try again.');
        return;
      }

      const productId = products[0].id;
      console.log('Found product ID:', productId, 'for product title:', productTitle);

      // Check if the user has already reviewed this product from this order
      const hasReviewed = await hasUserReviewedProduct(productId, orderId);

      if (hasReviewed) {
        toast.info('You have already reviewed this product');
        return;
      }

      // Set the review modal state
      setReviewOrderId(orderId);
      setReviewProductId(productId);
      setReviewProductTitle(productTitle);
      setReviewProductImage(productImage || '');
      setReviewModalOpen(true);
    } catch (error) {
      console.error('Error checking if user has reviewed product:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  // Function to handle review submission completion
  const handleReviewSubmitted = () => {
    console.log('Review submitted successfully');
    // Refresh the orders data to update the UI
    fetchOrders();
  };

  const updateQuantity = async (itemId: string | undefined, newQuantity: number) => {
    // If itemId is undefined, we can't update the quantity
    if (!itemId) {
      console.error('Cannot update quantity: itemId is undefined');
      return;
    }

    if (newQuantity < 1) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });

      // Remove from database
      await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
    } else {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: { productId: itemId, quantity: newQuantity }
      });

      // Update in database
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', itemId)
          .eq('user_id', session.user.id);
      }
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const totalAmount = cartState.items.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0
  );

  const renderAddressForm = (address: Address, isNew: boolean = false) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Street Address</label>
        <input
          type="text"
          value={address.street}
          onChange={(e) => handleAddressChange(isNew ? 'new' : address.id, 'street', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">City</label>
          <input
            type="text"
            value={address.city}
            onChange={(e) => handleAddressChange(isNew ? 'new' : address.id, 'city', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">State/County/Province</label>
          <input
            type="text"
            value={address.state}
            onChange={(e) => handleAddressChange(isNew ? 'new' : address.id, 'state', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Postal Code</label>
          <input
            type="text"
            value={address.postalCode}
            onChange={(e) => handleAddressChange(isNew ? 'new' : address.id, 'postalCode', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Country</label>
          <select
            value={address.country}
            onChange={(e) => handleAddressChange(isNew ? 'new' : address.id, 'country', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm"
          >
            <option value="">Select a country</option>
            {countries.map(country => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancelAddressEdit}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSaveAddress(isNew ? 'new' : address.id)}
          className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-900"
        >
          Save Address
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-24 sm:py-32 px-4">
      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        productId={reviewProductId}
        orderId={reviewOrderId}
        productTitle={reviewProductTitle}
        productImage={reviewProductImage}
        onReviewSubmitted={handleReviewSubmitted}
      />
      <div className="flex justify-end mb-8">
        <button
          onClick={handleSignOut}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </div>

      {!isAuthenticated && !isLoading ? (
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your account.</p>
          <button
            onClick={() => navigate('/login', { state: { from: location.pathname } })}
            className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900"
          >
            Go to Login
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
          <Tab.List className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 rounded-xl bg-gray-100 p-1">
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${selected
                ? 'bg-white text-black shadow'
                : 'text-gray-600 hover:bg-white/[0.12] hover:text-black'
              }`
            }>
              <div className="flex items-center justify-start sm:justify-center space-x-2 px-4 sm:px-0">
                <User className="w-4 h-4" />
                <span>Profile</span>
              </div>
            </Tab>
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${selected
                ? 'bg-white text-black shadow'
                : 'text-gray-600 hover:bg-white/[0.12] hover:text-black'
              }`
            }>
              <div className="flex items-center justify-start sm:justify-center space-x-2 px-4 sm:px-0">
                <MapPin className="w-4 h-4" />
                <span>Addresses</span>
              </div>
            </Tab>
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${selected
                ? 'bg-white text-black shadow'
                : 'text-gray-600 hover:bg-white/[0.12] hover:text-black'
              }`
            }>
              <div className="flex items-center justify-start sm:justify-center space-x-2 px-4 sm:px-0">
                <ShoppingCart className="w-4 h-4" />
                <span>Cart</span>
              </div>
            </Tab>

            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
            ${selected
                ? 'bg-white text-black shadow'
                : 'text-gray-600 hover:bg-white/[0.12] hover:text-black'
              }`
            }>
              <div className="flex items-center justify-start sm:justify-center space-x-2 px-4 sm:px-0">
                <Package className="w-4 h-4" />
                <span>Orders</span>
              </div>
            </Tab>
          </Tab.List>
          <Tab.Panels className="mt-8 sm:mt-12">
            <Tab.Panel>
              <ProfileForm />
            </Tab.Panel>
            <Tab.Panel>
              <AddressForm />
            </Tab.Panel>
            <Tab.Panel>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-6">Shopping Cart</h2>
                {cartState.isLoading ? (
                  <div className="py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading cart...</p>
                  </div>
                ) : cartState.items.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cartState.items.map(item => (
                      <div key={item.productId} className="flex items-center justify-between border-b border-gray-200 pb-4">
                        <div className="flex items-center space-x-4">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                          <div>
                            <h3 className="font-medium">{item.title}</h3>
                            <p className="text-sm text-gray-500">
                              Size: {item.size} | Color: {item.color}
                            </p>
                            <p className="text-sm font-medium">${item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 rounded-md hover:bg-gray-100"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 rounded-md hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center space-x-4">
                            <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                            <button
                              onClick={() => updateQuantity(item.id, 0)}
                              className="text-red-600 hover:text-red-800 transition-colors duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-4">
                      <div>
                        <p className="text-lg font-medium">Total: ${totalAmount.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={handleCheckout}
                        className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-900"
                      >
                        Checkout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Tab.Panel>

            <Tab.Panel>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="mb-6 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Order History</h2>
                  <button
                    onClick={() => {
                      console.log('🔄 MANUAL REFRESH - Refreshing orders...');
                      fetchOrders();
                    }}
                    disabled={ordersLoading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ordersLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 mr-2" />
                        Refresh Orders
                      </>
                    )}
                  </button>
                </div>
                {ordersLoading ? (
                  <div className="py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No orders found</p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                        {/* Order Items - Moved to the top */}
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Order Items</h4>
                          <div className="space-y-3">
                            {(() => {
                              // Handle both old format (items array) and new format (items object with discount_info)
                              const itemsData = order.items;
                              const actualItems = Array.isArray(itemsData) ? itemsData : (itemsData?.items || []);

                              return actualItems && actualItems.length > 0 ? (
                                actualItems.map((item, index) => (
                                  <div key={index} className="flex items-start space-x-3">
                                    {item.image && (
                                      <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-12 h-12 object-cover rounded"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium">{item.title}</p>
                                      <div className="text-sm text-gray-500">
                                        <span>Qty: {item.quantity}</span>
                                        {item.color && <span> • Color: {item.color}</span>}
                                        {item.size && <span> • Size: {item.size}</span>}
                                      </div>
                                      <p className="text-sm">Price: ${item.price.toFixed(2)}</p>
                                      {item.personalizationText && (
                                        <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                                          <span className="font-medium">Personalization: </span>
                                          <div className="text-gray-700 break-words whitespace-pre-wrap overflow-hidden" style={{ wordBreak: 'break-all' }}>
                                            {item.personalizationText}
                                          </div>
                                        </div>
                                      )}

                                      {/* Review button - only show for delivered orders */}
                                      {(order.shipping_status === 'Delivered' || order.shipping_status === 'delivered') && (
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleOpenReviewModal(
                                              order.id,
                                              item.id || item.productId,
                                              item.title,
                                              item.image
                                            );
                                          }}
                                          className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                                        >
                                          <Star className="w-3 h-3 mr-1" />
                                          Write a Review
                                        </button>
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

                        {/* Order Details - Moved below items */}
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-gray-500">Order ID</p>
                              <p className="font-medium">{order.id}</p>
                              <p className="text-sm text-gray-500 mt-2">Date</p>
                              <p className="font-medium">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-500 mt-2">Shipping Address</p>
                              <div className="font-medium">
                                {order.shipping_address ? (
                                  <>
                                    {/* Display name if available */}
                                    {order.shipping_address.name && (
                                      <p>{order.shipping_address.name}</p>
                                    )}

                                    {/* Display address line 1 - try both line1 and address.line1 */}
                                    {order.shipping_address.line1 ? (
                                      <p>{order.shipping_address.line1}</p>
                                    ) : order.shipping_address.address && order.shipping_address.address.line1 ? (
                                      <p>{order.shipping_address.address.line1}</p>
                                    ) : null}

                                    {/* Display address line 2 if available */}
                                    {(order.shipping_address.line2 || (order.shipping_address.address && order.shipping_address.address.line2)) && (
                                      <p>{order.shipping_address.line2 || order.shipping_address.address.line2}</p>
                                    )}

                                    {/* Display city, state, postal code */}
                                    <p>
                                      {order.shipping_address.city || (order.shipping_address.address && order.shipping_address.address.city) || ''}
                                      {(order.shipping_address.city || (order.shipping_address.address && order.shipping_address.address.city)) ? ', ' : ''}
                                      {order.shipping_address.state || (order.shipping_address.address && order.shipping_address.address.state) || ''}
                                      {order.shipping_address.postal_code || (order.shipping_address.address && order.shipping_address.address.postal_code) || ''}
                                    </p>

                                    {/* Display country */}
                                    <p>{order.shipping_address.country || (order.shipping_address.address && order.shipping_address.address.country) || ''}</p>

                                    {/* Display phone if available */}
                                    <p>Phone: {order.shipping_address.phone || ''}</p>
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-500">No shipping address available</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {/* Subtotal - calculate from all items */}
                              <p className="text-sm text-gray-500">Subtotal</p>
                              {(() => {
                                // Handle both old format (items array) and new format (items object with discount_info)
                                const itemsData = order.items;
                                const actualItems = Array.isArray(itemsData) ? itemsData : (itemsData?.items || []);

                                // Calculate subtotal from items
                                const calculatedSubtotal = actualItems && actualItems.length > 0
                                  ? parseFloat(actualItems.reduce((sum: number, item: any) =>
                                    sum + (parseFloat(item.price) * item.quantity), 0).toFixed(2))
                                  : ((order.amount_total - (order.shipping_cost || 0) + (order.discount_amount || 0)) / 100);

                                // Log for debugging
                                console.log(`🔍 ORDER ${order.id} - Calculated subtotal: $${calculatedSubtotal.toFixed(2)}`);

                                return (
                                  <p className="font-medium">
                                    ${calculatedSubtotal.toFixed(2)}
                                  </p>
                                );
                              })()}

                              {/* Discount - Always show, even if it's zero */}
                              <p className="text-sm text-gray-500 mt-1">Discount</p>
                              {(() => {
                                // Handle both old format (items array) and new format (items object with discount_info)
                                const itemsData = order.items;
                                const discountInfo = Array.isArray(itemsData) ? null : itemsData?.discount_info;

                                // Get discount data from either the old columns or the embedded discount_info
                                const discountAmount = order.discount_amount || discountInfo?.discount_amount || 0;
                                const discountType = order.discount_type || discountInfo?.discount_type;
                                const discountPercentage = order.discount_percentage || discountInfo?.discount_percentage;
                                const promoCode = order.promo_code || discountInfo?.promo_code;

                                // Log discount info for debugging
                                console.log(`🔍 ORDER ${order.id} - Discount info:`, {
                                  discount_amount: discountAmount,
                                  discount_type: discountType,
                                  discount_percentage: discountPercentage,
                                  promo_code: promoCode,
                                  embedded_discount_info: discountInfo
                                });

                                return (
                                  <p className={`font-medium ${discountAmount > 0 ? 'text-green-600' : ''}`}>
                                    {discountAmount > 0 ? (
                                      <>
                                        {discountType === 'percentage' && discountPercentage ? (
                                          `(${discountPercentage}%) -$${(discountAmount / 100).toFixed(2)}`
                                        ) : (
                                          `-$${(discountAmount / 100).toFixed(2)}`
                                        )}
                                      </>
                                    ) : '$0.00'}
                                  </p>
                                );
                              })()}

                              {/* Shipping Cost - Always show */}
                              <p className="text-sm text-gray-500 mt-1">Shipping</p>
                              <p className="font-medium">
                                ${((order.shipping_cost || 0) / 100).toFixed(2)}
                              </p>

                              {/* Total - Calculate correctly from subtotal, discount, and shipping */}
                              <p className="text-sm text-gray-500 mt-1">Total</p>
                              {(() => {
                                // Handle both old format (items array) and new format (items object with discount_info)
                                const itemsData = order.items;
                                const actualItems = Array.isArray(itemsData) ? itemsData : (itemsData?.items || []);
                                const discountInfo = Array.isArray(itemsData) ? null : itemsData?.discount_info;

                                // Calculate subtotal from items
                                const calculatedSubtotal = actualItems && actualItems.length > 0
                                  ? parseFloat(actualItems.reduce((sum: number, item: any) =>
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
                                console.log(`🔍 ORDER ${order.id} - Total calculation:`, {
                                  calculatedSubtotal,
                                  discountAmount,
                                  shippingCost,
                                  calculatedTotal,
                                  storedTotal: (order.amount_total || 0) / 100
                                });

                                // Use calculated total instead of stored total
                                return (
                                  <p className="font-medium font-bold">
                                    ${calculatedTotal.toFixed(2)}
                                  </p>
                                );
                              })()}

                              <p className="text-sm text-gray-500 mt-2">Status</p>
                              <div className="font-medium capitalize">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.shipping_status === 'Delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : order.shipping_status === 'In Transit'
                                    ? 'bg-blue-100 text-blue-800'
                                    : order.shipping_status === 'On Delivery'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {order.shipping_status || "Order Sent"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      )}
    </div>
  );
};