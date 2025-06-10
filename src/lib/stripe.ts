import { supabase } from './supabase';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { validateLocalCoupon } from '../services/couponService';

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
  clientSecret?: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

// Function to create a payment intent with fixed shipping cost
// This is a workaround for the Stripe API issue with shipping cost display
export async function createPaymentIntentWithFixedShipping(
  items: Array<{
    price: number;
    quantity: number;
    title: string;
    color?: string;
    size?: string;
    image?: string;
    personalizationText?: string;
  }>,
  promoCode?: string,
  shippingAddress?: any,
  shippingCost?: number
): Promise<PaymentIntentResponse> {
  // EXTREME WORKAROUND: Pass a tiny value to force Stripe to display the correct amount
  // The issue is that Stripe is dividing our shipping cost by 100 again
  // So we need to multiply by 10000 to get the correct display
  // For example, if we want to display $4.00, we need to pass 400.00
  const fixedShippingCost = (shippingCost || 4.00) * 100; // Multiply by 100 to counteract Stripe's division
  console.log(`EXTREME SHIPPING WORKAROUND: Original: ${shippingCost}, Fixed: ${fixedShippingCost}`);

  // Call the original createPaymentIntent function with our extremely adjusted shipping cost
  return createPaymentIntent(items, promoCode, shippingAddress, fixedShippingCost);
}

export interface PromoCodeValidationResponse {
  valid: boolean;
  discountType?: 'percentage' | 'fixed_amount';
  discountAmount?: number;
  message?: string;
  couponId?: string;
}

// Function to validate a promo code using local database
export async function validatePromoCode(code: string): Promise<PromoCodeValidationResponse> {
  if (!code || code.trim() === '') {
    return {
      valid: false,
      message: 'Please enter a valid promo code'
    };
  }

  try {
    // Validate using local database
    const result = await validateLocalCoupon(code.trim().toUpperCase());

    return result;
  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return {
      valid: false,
      message: error.message || 'An error occurred while validating the promo code'
    };
  }
}

// Function to retrieve a checkout session directly from Stripe
export async function retrieveCheckoutSession(sessionId: string): Promise<{ clientSecret: string } | null> {
  try {
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    console.log('Retrieving checkout session from Stripe:', sessionId);

    // Use Stripe.js to retrieve the session
    const result = await stripe.retrieveCheckoutSession(sessionId);
    console.log('Stripe checkout session result:', result);

    if (result && result.client_secret) {
      return {
        clientSecret: result.client_secret
      };
    }

    return null;
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return null;
  }
}

// Function to create a payment intent for Stripe Elements
export async function createPaymentIntent(
  items: Array<{
    price: number;
    quantity: number;
    title: string;
    color?: string;
    size?: string;
    image?: string;
    personalizationText?: string;
  }>,
  promoCode?: string,
  shippingAddress?: any,
  shippingCost?: number
): Promise<PaymentIntentResponse> {
  try {
    // Check for Supabase Auth session
    const { data: { session } } = await supabase.auth.getSession();

    // Check for custom auth
    const customUser = localStorage.getItem('user');
    const isCustomAuth = !session && !!customUser;
    let isGuestUser = !session && !customUser;

    console.log('Auth status:', {
      hasSupabaseSession: !!session,
      hasCustomAuth: isCustomAuth,
      isGuestUser: isGuestUser
    });

    // Get user ID from either auth method or generate a guest ID
    let userId = session?.user?.id || (customUser ? JSON.parse(customUser).id : null);
    // Update the isGuestUser variable based on userId
    isGuestUser = !userId; // This is fine since isGuestUser is declared with 'let'

    // For guest users, generate a temporary ID
    if (isGuestUser) {
      userId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log('Generated guest user ID:', userId);
    }

    let shippingAddress = null;

    // For guest users, we won't try to fetch shipping address from the database
    // It will be collected during checkout
    if (!isGuestUser) {
      // Get user's default shipping address
      const { data: addresses } = await supabase
        .from('addresses')
        .select('*')
        .eq('is_default', true)
        .limit(1);

      if (addresses && addresses.length > 0) {
        const defaultAddress = addresses[0];
        console.log('Found default shipping address:', defaultAddress);

        // Get user profile for name - try both methods
        let profile = null;

        if (session) {
          // If using Supabase Auth, get profile from profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, phone')
            .eq('id', userId)
            .single();

          profile = profileData;
        } else if (customUser) {
          // If using custom auth, get profile from localStorage
          const userData = JSON.parse(customUser);
          profile = {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone || ''
          };
        }

        if (profile) {
          // Format shipping address for Stripe
          shippingAddress = {
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            phone: profile.phone || '',
            address: {
              line1: defaultAddress.street || '',
              line2: '',
              city: defaultAddress.city || '',
              state: defaultAddress.state || '',
              postal_code: defaultAddress.postal_code || '',
              country: defaultAddress.country || 'US'
            }
          };

          console.log('Formatted shipping address for payment intent:', shippingAddress);
        }
      }
    } else {
      console.log('Guest user - no shipping address to fetch from database');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-payment-intent`;
    console.log('Creating payment intent with:', { items, shippingAddress });

    // Create headers based on auth method
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (session) {
      // If using Supabase Auth, use the session token
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else if (customUser) {
      // If using custom auth, add a custom header
      headers['X-Custom-Auth'] = 'true';
      headers['X-User-ID'] = JSON.parse(customUser).id;
    } else {
      // For guest users
      headers['X-Guest-Checkout'] = 'true';
      headers['X-Guest-ID'] = userId;
      console.log('Setting guest headers:', headers);
    }

    // Try RPC approach first if we have a session
    if (session) {
      console.log('Attempting to create payment intent via Supabase RPC');

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_payment_intent', {
          items_json: JSON.stringify(items),
          promo_code: promoCode ? promoCode.trim() : null,
          shipping_address_json: shippingAddress ? JSON.stringify(shippingAddress) : null,
          user_id: userId
        });

        if (rpcError) {
          // If the function doesn't exist, just log and continue to fallback
          if (rpcError.message.includes('function "create_payment_intent" does not exist')) {
            console.log('RPC function does not exist, skipping this approach');
          } else {
            console.error('RPC error creating payment intent:', rpcError);
            throw rpcError;
          }
        }

        if (rpcData && rpcData.client_secret) {
          console.log('Successfully created payment intent via RPC');
          // Skip the fetch call and use the RPC response
          return {
            clientSecret: rpcData.client_secret,
            paymentIntentId: rpcData.payment_intent_id
          };
        }
      } catch (rpcError) {
        console.error('Exception during RPC payment intent creation:', rpcError);
        // Continue with the fetch approach as fallback
      }
    }

    // Use provided shipping cost or calculate it locally
    let finalShippingCost = 0;

    if (shippingCost !== undefined) {
      // EXTREME DEBUGGING: Log the shipping cost before any conversion
      console.log(`SHIPPING DEBUG - Raw shipping cost: ${shippingCost}`);

      // For our extreme workaround, we're passing a value that's already multiplied by 100
      // This should counteract Stripe's division by 100 when displaying
      finalShippingCost = shippingCost;
      console.log(`SHIPPING DEBUG - Using shipping cost: $${shippingCost} (this should display as $${shippingCost / 100} in Stripe)`);
    } else if (isGuestUser) {
      // Calculate shipping cost for guest users if not provided
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // Default shipping costs (will be overridden by server if available)
      const baseShippingCost = 400; // $4.00 in cents
      const additionalItemCost = 100; // $1.00 in cents

      // Calculate shipping cost
      finalShippingCost = baseShippingCost;
      if (totalQuantity > 1) {
        finalShippingCost = baseShippingCost + ((totalQuantity - 1) * additionalItemCost);
      }

      console.log(`Calculated local shipping cost for guest user: $${finalShippingCost / 100} for ${totalQuantity} items`);
    }

    // Fallback to the Edge Function approach
    console.log('Falling back to Edge Function for payment intent creation');

    // For guest users, include the guest ID in the request body instead of headers
    // to avoid CORS issues with custom headers
    const requestBody = {
      items,
      promoCode: promoCode ? promoCode.trim() : undefined,
      shippingAddress,
      userId, // Always include userId in the request body
      email: session?.user?.email || (customUser ? JSON.parse(customUser).email : null),
      shipping_cost: finalShippingCost, // Always include shipping cost
      isGuestUser: isGuestUser,
      guestId: isGuestUser ? userId : undefined
    };

    console.log('Sending request with body:', JSON.stringify(requestBody));

    // Use a try-catch block to handle potential CORS errors
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (fetchError) {
      console.error('Fetch error (likely CORS):', fetchError);

      // Try a fallback approach without custom headers for guest users
      if (isGuestUser) {
        console.log('Trying fallback approach without custom headers');

        // Remove potentially problematic headers
        const simpleHeaders = {
          'Content-Type': 'application/json'
        };

        response = await fetch(apiUrl, {
          method: 'POST',
          headers: simpleHeaders,
          body: JSON.stringify(requestBody)
        });
      } else {
        // Re-throw the error if not a guest user
        throw fetchError;
      }
    }

    const responseText = await response.text();
    console.log('Raw response from Stripe payment intent API:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      throw new Error('Invalid response from payment service');
    }

    if (!response.ok) {
      console.error('Payment intent API error:', data);
      throw new Error(data.error || 'Failed to create payment intent');
    }

    console.log('Payment intent created:', data);

    if (!data.clientSecret) {
      console.error('Missing client secret in response:', data);
      throw new Error('Missing client secret in response');
    }

    return {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId
    };
  } catch (error: any) {
    console.error('Payment intent error:', error);
    throw error;
  }
}

export async function createCheckoutSession(items: Array<{
  price: number;
  quantity: number;
  title: string;
}>) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
    console.log('Creating checkout session with:', { items });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        items,
        // Using hosted mode for redirect approach
        ui_mode: 'hosted'
      })
    });

    const responseText = await response.text();
    console.log('Raw response from Stripe checkout API:', responseText);
    let data;

    try {
      data = JSON.parse(responseText);
      console.log('Response data structure:', JSON.stringify(data, null, 2));
      // Log all keys in the response
      console.log('Response keys:', Object.keys(data));
      // Log the entire data object
      console.log('Full response data:', data);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      throw new Error('Invalid response from payment service');
    }

    if (!response.ok) {
      console.error('Checkout API error:', data);
      throw new Error(data.error || 'Failed to create checkout session');
    }

    console.log('Checkout session created:', data);

    // Handle different response formats
    let sessionId = data?.sessionId;
    let clientSecret = data?.clientSecret;

    // If client_secret is available but clientSecret is not
    if (!clientSecret && data?.client_secret) {
      clientSecret = data.client_secret;
      console.log('Using client_secret from response');
    }

    // If id is available but sessionId is not
    if (!sessionId && data?.id) {
      sessionId = data.id;
      console.log('Using id from response as sessionId');
    }

    // Check if the data is nested in a 'session' object
    if (!sessionId && !clientSecret && data?.session) {
      console.log('Found session object in response');
      if (data.session.id) {
        sessionId = data.session.id;
        console.log('Using session.id as sessionId');
      }
      if (data.session.client_secret) {
        clientSecret = data.session.client_secret;
        console.log('Using session.client_secret as clientSecret');
      }
    }

    // Check if the data is in a different format
    if (!sessionId && data?.url) {
      // Extract session ID from URL if present
      const urlMatch = data.url.match(/checkout\/([^\/\?]+)/);
      if (urlMatch && urlMatch[1]) {
        sessionId = urlMatch[1];
        console.log('Extracted sessionId from URL:', sessionId);
      }
    }

    console.log('Final Session ID:', sessionId);
    console.log('Final Client Secret:', clientSecret);

    // We need both sessionId and clientSecret for embedded checkout
    // If we don't have clientSecret, try to extract it from the URL or other fields
    if (sessionId && !clientSecret) {
      console.log('Attempting to find client secret from other fields');

      // Try to find client_secret in the URL if it exists
      if (data?.url && data.url.includes('client_secret=')) {
        const urlParams = new URLSearchParams(data.url.split('?')[1]);
        const urlClientSecret = urlParams.get('client_secret');
        if (urlClientSecret) {
          clientSecret = urlClientSecret;
          console.log('Extracted client secret from URL');
        }
      }

      // If we still don't have a client secret, check other possible locations
      if (!clientSecret && data?.payment_intent && data.payment_intent.client_secret) {
        clientSecret = data.payment_intent.client_secret;
        console.log('Using payment_intent.client_secret');
      }

      // If we still don't have a client secret, try to retrieve it directly from Stripe
      if (!clientSecret && sessionId) {
        console.log('Attempting to retrieve client secret directly from Stripe');
        try {
          const result = await retrieveCheckoutSession(sessionId);
          if (result && result.clientSecret) {
            clientSecret = result.clientSecret;
            console.log('Successfully retrieved client secret from Stripe');
          }
        } catch (error) {
          console.error('Error retrieving client secret from Stripe:', error);
        }
      }
    }

    // If we have a URL, redirect to Stripe Checkout
    if (data?.url) {
      console.log('Redirecting to Stripe Checkout:', data.url);

      // Store checkout information in session storage
      window.sessionStorage.setItem('checkout_session_id', sessionId || '');
      window.sessionStorage.setItem('checkout_return_url', window.location.href);

      // Redirect to Stripe checkout
      window.location.href = data.url;

      // Return the session data (this won't actually be used due to the redirect)
      return {
        sessionId: sessionId || '',
        url: data.url
      };
    }

    if (!sessionId) {
      console.error('Missing session ID in response:', data);
      throw new Error('Missing session ID in response');
    }

    if (!clientSecret) {
      console.error('Missing client secret in response:', data);
      throw new Error('Missing client secret in response');
    }

    return {
      sessionId: sessionId,
      clientSecret: clientSecret
    };
  } catch (error: any) {
    console.error('Checkout error:', error);
    throw error;
  }
}