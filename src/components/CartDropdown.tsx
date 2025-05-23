import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Plus, Minus, Loader } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getShippingConfig } from '../api/shipping-proxy';

interface CartDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDropdown: React.FC<CartDropdownProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shippingConfig, setShippingConfig] = useState({ base_shipping_cost: 500, additional_item_cost: 250 });

  useEffect(() => {
    const fetchShippingConfig = async () => {
      try {
        const config = await getShippingConfig();
        setShippingConfig({
          base_shipping_cost: config.base_shipping_cost,
          additional_item_cost: config.additional_item_cost
        });
      } catch (error) {
        console.error('Error fetching shipping config in cart dropdown:', error);
      }
    };

    fetchShippingConfig();
  }, []);

  const calculateShipping = () => {
    if (state.items.length === 0) return 0;
    const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
    const shippingAmountCents = shippingConfig.base_shipping_cost + (Math.max(0, totalItems - 1) * shippingConfig.additional_item_cost);
    return shippingAmountCents / 100; // Convert from cents to dollars
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });

      // Remove from database if user is logged in
      if (user) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);
      }
    } else {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: { productId: itemId, quantity: newQuantity }
      });

      // Update in database if user is logged in
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from('cart_items')
            .update({ quantity: newQuantity })
            .eq('id', itemId)
            .eq('user_id', session.user.id);
        }
      }
    }
  };

  const handleCheckout = () => {
    // Allow guest checkout - no authentication check needed
    console.log('Proceeding to checkout as guest or authenticated user');
    navigate('/checkout');
    onClose();
  };

  const totalAmount = state.items.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0
  );

  return (
    <div
      className={`
        absolute right-0 mt-2 w-screen max-w-sm bg-white rounded-lg shadow-lg
        transform transition-all duration-300 ease-in-out origin-top-right
        ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      `}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Shopping Cart</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.isLoading ? (
          <div className="py-8 text-center">
            <Loader className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
            <p className="mt-4 text-gray-500">Loading cart...</p>
          </div>
        ) : state.items.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">Your cart is empty</p>
            <Link
              to="/products"
              className="mt-4 inline-block text-sm text-black hover:underline"
              onClick={onClose}
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {state.items.map((item) => (
                <div key={item.productId} className="py-4 flex">
                  <div className="flex-shrink-0 w-16 h-16">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        {item.title}
                      </h3>
                      <p className="text-sm font-medium text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.color} • {item.size}
                    </p>
                    {item.personalizationText && (
                      <div className="mt-1 text-sm text-gray-500 italic overflow-hidden">
                        <div className="break-words whitespace-pre-wrap" style={{ wordBreak: 'break-all', maxWidth: '100%' }}>
                          "{item.personalizationText}"
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex items-center">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="text-gray-500 hover:text-gray-600"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="mx-2 text-gray-600">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="text-gray-500 hover:text-gray-600"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateQuantity(item.id, 0)}
                        className="ml-4 text-sm text-red-600 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-base font-medium text-gray-900">
                <p>Subtotal</p>
                <p>${totalAmount.toFixed(2)}</p>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <p>Shipping</p>
                <p>${calculateShipping().toFixed(2)}</p>
              </div>
              <div className="flex justify-between text-base font-medium text-gray-900 mt-2 pt-2 border-t border-gray-100">
                <p>Total</p>
                <p>${(totalAmount + calculateShipping()).toFixed(2)}</p>
              </div>
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleCheckout}
                  className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-900"
                >
                  Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};