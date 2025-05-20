import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { CartItem } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

interface CartState {
  items: CartItem[];
  isLoading: boolean;
}

type CartAction =
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'SET_LOADING'; payload: boolean };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_TO_CART':
      const existingItem = state.items.find(item =>
        item.productId === action.payload.productId &&
        item.size === action.payload.size &&
        item.color === action.payload.color &&
        item.personalizationText === action.payload.personalizationText
      );

      // If the item already exists, update its quantity
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.productId === action.payload.productId &&
              item.size === action.payload.size &&
              item.color === action.payload.color &&
              item.personalizationText === action.payload.personalizationText
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          )
        };
      }

      // If it's a new item, generate a temporary ID and add it to the cart
      const newItem = {
        ...action.payload,
        // Generate a temporary ID that will be replaced with the real one after database insert
        id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      };

      return {
        ...state,
        items: [...state.items, newItem]
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    case 'SET_CART':
      return {
        ...state,
        items: action.payload,
        isLoading: false
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(cartReducer, { items: [], isLoading: true });

  // Load cart from localStorage on initial render or user change
  useEffect(() => {
    try {
      // Check if user is logged in
      if (user) {
        // User is logged in, load their specific cart
        const userCartKey = `cart_${user.id}`;
        console.log(`User is logged in (${user.id}), attempting to load their cart`);

        const savedCart = localStorage.getItem(userCartKey);
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart) && parsedCart.length > 0) {
            console.log(`Loading user cart from localStorage (${userCartKey}):`, parsedCart.length, 'items');
            dispatch({ type: 'SET_CART', payload: parsedCart });
          } else {
            console.log(`User cart exists but is empty for user ${user.id}`);
            dispatch({ type: 'SET_CART', payload: [] });
          }
        } else {
          console.log(`No cart found for user ${user.id}, setting empty cart`);
          dispatch({ type: 'SET_CART', payload: [] });
        }
      } else {
        // No user is logged in, show an empty cart
        // For guest users, we don't load from localStorage - cart will be in-memory only
        console.log('No user is logged in, showing empty cart (guest cart will be in-memory only)');
        dispatch({ type: 'SET_CART', payload: [] });

        // Remove any old cart formats
        if (localStorage.getItem('cart')) {
          console.log('Found old cart format, removing it');
          localStorage.removeItem('cart');
        }
        if (localStorage.getItem('cart_guest')) {
          console.log('Found guest cart in localStorage, removing it');
          localStorage.removeItem('cart_guest');
        }
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }, [user]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!state.isLoading) {
      try {
        if (user) {
          // User is logged in, save to their specific cart
          const userCartKey = `cart_${user.id}`;
          localStorage.setItem(userCartKey, JSON.stringify(state.items));
          console.log(`Saved cart to localStorage for user (${userCartKey}):`, state.items.length, 'items');
        } else {
          // No user is logged in, don't save the cart
          console.log('No user is logged in, not saving cart to localStorage');
        }
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    }
  }, [state.items, state.isLoading, user]);

  useEffect(() => {
    const loadCart = async () => {
      try {
        if (!user) {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        const { data: cartItems, error } = await supabase
          .from('cart_items')
          .select(`
            *,
            products (
              title,
              price,
              product_images (
                url,
                is_primary
              )
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        if (cartItems && cartItems.length > 0) {
          const formattedItems: CartItem[] = cartItems.map(item => ({
            id: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            title: item.products.title,
            price: item.products.price,
            personalizationText: item.personalization_text || undefined,
            image: item.products.product_images.find(img => img.is_primary)?.url ||
              item.products.product_images[0]?.url
          }));

          // Merge with localStorage cart if needed
          const cartKey = user ? `cart_${user.id}` : 'cart_guest';
          const savedCart = localStorage.getItem(cartKey);
          if (savedCart) {
            try {
              const localCart = JSON.parse(savedCart);
              if (Array.isArray(localCart) && localCart.length > 0) {
                console.log(`Merging database cart with localStorage cart (${cartKey})`);
                // Use database cart as it's more authoritative
                dispatch({ type: 'SET_CART', payload: formattedItems });
              } else {
                dispatch({ type: 'SET_CART', payload: formattedItems });
              }
            } catch (e) {
              dispatch({ type: 'SET_CART', payload: formattedItems });
            }
          } else {
            dispatch({ type: 'SET_CART', payload: formattedItems });
          }
        } else {
          // If no items in database but we have items in localStorage, keep using localStorage
          const cartKey = user ? `cart_${user.id}` : 'cart_guest';
          const savedCart = localStorage.getItem(cartKey);
          if (savedCart) {
            try {
              const localCart = JSON.parse(savedCart);
              if (Array.isArray(localCart) && localCart.length > 0) {
                console.log(`No items in database, using localStorage cart (${cartKey})`);
                // Keep the localStorage cart
              } else {
                dispatch({ type: 'SET_CART', payload: [] });
              }
            } catch (e) {
              dispatch({ type: 'SET_CART', payload: [] });
            }
          } else {
            dispatch({ type: 'SET_CART', payload: [] });
          }
        }
      } catch (error) {
        console.error('Error loading cart from database:', error);
        toast.error('Failed to load cart items');

        // Fall back to localStorage if database fails
        try {
          const cartKey = user ? `cart_${user.id}` : 'cart_guest';
          const savedCart = localStorage.getItem(cartKey);
          if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            if (Array.isArray(parsedCart) && parsedCart.length > 0) {
              console.log(`Falling back to localStorage cart (${cartKey}) after database error`);
              // Keep using the localStorage cart
            }
          }
        } catch (e) {
          console.error('Error loading fallback cart from localStorage:', e);
        }
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    if (user) {
      loadCart();
    } else {
      // If no user, still check localStorage for cart items
      try {
        const cartKey = 'cart_guest';
        const savedCart = localStorage.getItem(cartKey);
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart) && parsedCart.length > 0) {
            console.log(`No user, but found cart in localStorage (${cartKey}):`, parsedCart.length, 'items');
            dispatch({ type: 'SET_CART', payload: parsedCart });
          } else {
            dispatch({ type: 'SET_CART', payload: [] });
          }
        } else {
          dispatch({ type: 'SET_CART', payload: [] });
        }
      } catch (e) {
        console.error('Error checking localStorage cart for guest user:', e);
        dispatch({ type: 'SET_CART', payload: [] });
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    }

  }, [user]);

  useEffect(() => {
    const syncCart = async () => {
      if (!user) return;

      try {
        // Upsert cart items
        if (state.items.length > 0) {
          // First, handle items with real IDs (existing items)
          const itemsWithRealIds = state.items.filter(item => item.id && !item.id.toString().startsWith('temp_'));
          if (itemsWithRealIds.length > 0) {
            const { error: updateError } = await supabase
              .from('cart_items')
              .upsert(
                itemsWithRealIds.map(item => ({
                  id: item.id,
                  user_id: user.id,
                  product_id: item.productId,
                  quantity: item.quantity,
                  size: item.size,
                  color: item.color,
                  personalization_text: item.personalizationText || null
                }))
                , {
                  onConflict: 'id',
                  ignoreDuplicates: false
                });
            if (updateError) throw updateError;
          }

          // Then, handle items with temporary IDs or no IDs (new items)
          const itemsToInsert = state.items.filter(item => !item.id || item.id.toString().startsWith('temp_'));
          if (itemsToInsert.length > 0) {
            const { data: insertedItems, error: insertError } = await supabase
              .from('cart_items')
              .insert(
                itemsToInsert.map(item => ({
                  user_id: user.id,
                  product_id: item.productId,
                  quantity: item.quantity,
                  size: item.size,
                  color: item.color,
                  personalization_text: item.personalizationText || null
                }))
              )
              .select();

            if (insertError) throw insertError;

            // Update the items in the state with the new IDs
            if (insertedItems) {
              const updatedItems = [...state.items];
              itemsToInsert.forEach((item, index) => {
                const foundIndex = updatedItems.findIndex(i =>
                  i.productId === item.productId &&
                  i.size === item.size &&
                  i.color === item.color &&
                  i.personalizationText === item.personalizationText &&
                  (!i.id || i.id.toString().startsWith('temp_'))
                );

                if (foundIndex !== -1 && insertedItems[index]) {
                  updatedItems[foundIndex] = {
                    ...updatedItems[foundIndex],
                    id: insertedItems[index].id
                  };
                }
              });

              // Update the state with the new IDs
              dispatch({ type: 'SET_CART', payload: updatedItems });
            }
          }
        }

        // If cart is empty, delete all items
        if (state.items.length === 0) {
          const { error: deleteAllError } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id);

          if (deleteAllError) throw deleteAllError;
        }

        // We'll rely on the upsert operation to handle updates and inserts
        // The unique constraint will ensure we don't have duplicates
      } catch (error) {
        console.error('Error syncing cart:', error);
        toast.error('Failed to sync cart items');
      }
    };

    if (!state.isLoading && user) {
      syncCart();
    }
  }, [state.items, state.isLoading, user]);

  // Listen for logout events
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user') {
        if (!event.newValue) {
          console.log('User logged out, switching to empty cart');
          // When a user logs out, we should show an empty cart
          // This ensures we don't show another user's cart items
          dispatch({ type: 'SET_CART', payload: [] });

          // Make sure we don't have any guest cart in localStorage
          try {
            if (localStorage.getItem('cart_guest')) {
              localStorage.removeItem('cart_guest');
              console.log('Cleared guest cart from localStorage on logout');
            }
          } catch (error) {
            console.error('Error clearing guest cart:', error);
          }
        } else {
          // User logged in, we'll let the main useEffect handle loading their cart
          console.log('User logged in, their cart will be loaded');
        }
      }
    };

    // Also listen for direct logout events
    const handleLogout = () => {
      console.log('Logout event detected, switching to empty cart');
      // When a user logs out, we should show an empty cart
      dispatch({ type: 'SET_CART', payload: [] });

      // Make sure we don't have any guest cart in localStorage
      try {
        if (localStorage.getItem('cart_guest')) {
          localStorage.removeItem('cart_guest');
          console.log('Cleared guest cart from localStorage on logout');
        }
      } catch (error) {
        console.error('Error clearing guest cart:', error);
      }
    };

    // Listen for login events
    const handleLogin = (event: CustomEvent) => {
      const userId = event.detail?.userId;
      console.log(`Login event detected for user ${userId}, loading their cart`);

      if (userId) {
        try {
          const userCartKey = `cart_${userId}`;
          const savedCart = localStorage.getItem(userCartKey);
          if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            if (Array.isArray(parsedCart) && parsedCart.length > 0) {
              console.log(`Loading user cart from localStorage (${userCartKey}):`, parsedCart.length, 'items');
              dispatch({ type: 'SET_CART', payload: parsedCart });
            } else {
              console.log(`User cart exists but is empty for user ${userId}`);
              dispatch({ type: 'SET_CART', payload: [] });
            }
          } else {
            console.log(`No cart found for user ${userId}, setting empty cart`);
            dispatch({ type: 'SET_CART', payload: [] });
          }
        } catch (error) {
          console.error('Error loading user cart:', error);
          dispatch({ type: 'SET_CART', payload: [] });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-logout', handleLogout);
    window.addEventListener('user-login', handleLogin as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-logout', handleLogout);
      window.removeEventListener('user-login', handleLogin as EventListener);
    };
  }, []);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};