import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleStripeCheckout } from './SimpleStripeCheckout';
import { useSupabase } from '../context/SupabaseContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export const StripeCheckoutWrapper: React.FC<{
  clientSecret: string;
  onSuccess?: (paymentIntentId: string) => void;
  onCancel?: () => void;
  shippingCost?: number; // Add shipping cost parameter
}> = ({ clientSecret, onSuccess, onCancel, shippingCost = 6.00 }) => {
  // IMPORTANT: We're hardcoding the shipping cost to $6.00 to ensure it's displayed correctly
  // This is a workaround for the Stripe API issue with shipping cost display
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasUserData, setHasUserData] = useState(false);

  // Check if user has profile data
  useEffect(() => {
    const checkUserData = async () => {
      // For guest users, we don't need to check for profile data
      if (!user) {
        console.log('Guest user detected in StripeCheckoutWrapper');
        setHasUserData(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check for profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error checking profile:', profileError);
        }

        // Check for address
        const { data: address, error: addressError } = await supabase
          .from('user_addresses')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle();

        if (addressError && addressError.code !== 'PGRST116') {
          console.error('Error checking address:', addressError);
        }

        // Set state based on whether we found data
        setHasUserData(!!profile || !!address);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking user data:', error);
        setIsLoading(false);
      }
    };

    checkUserData();
  }, [user, supabase]);

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    // If user is authenticated but doesn't have profile data, suggest they add it
    if (user && !hasUserData) {
      toast.info('Consider adding your profile and address information for faster checkout next time!', {
        autoClose: 8000,
        onClick: () => navigate('/account')
      });
    } else if (!user) {
      // For guest users, show a different message
      toast.info('Create an account to save your information for faster checkout next time!', {
        autoClose: 8000,
        onClick: () => navigate('/signup')
      });
    }

    // Get shipping address from localStorage
    try {
      console.log('🔍 DEBUG - StripeCheckoutWrapper - Looking for shipping address in localStorage');
      const savedShippingAddress = localStorage.getItem('last_shipping_address');
      if (savedShippingAddress && user) {
        console.log('🔍 DEBUG - StripeCheckoutWrapper - Found shipping address in localStorage:', savedShippingAddress);
        const shippingAddressObj = JSON.parse(savedShippingAddress);
        console.log('🔍 DEBUG - StripeCheckoutWrapper - Parsed shipping address:', JSON.stringify(shippingAddressObj, null, 2));

        // Find the order with this payment intent
        console.log('🔍 DEBUG - StripeCheckoutWrapper - Looking for order with payment intent ID:', paymentIntentId);
        const { data: orderData, error: orderError } = await supabase
          .from('stripe_orders')
          .select('id')
          .eq('payment_intent_id', paymentIntentId)
          .maybeSingle();

        if (orderError) {
          console.error('🔍 DEBUG - StripeCheckoutWrapper - Error finding order:', orderError);
        } else if (orderData) {
          console.log('🔍 DEBUG - StripeCheckoutWrapper - Found order with ID:', orderData.id);

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

          console.log('🔍 DEBUG - StripeCheckoutWrapper - Updating order with shipping address:', JSON.stringify(shippingAddressToSave, null, 2));

          // Update the order with the shipping address
          const { error: updateError } = await supabase
            .from('stripe_orders')
            .update({
              shipping_address: shippingAddressToSave
            })
            .eq('id', orderData.id);

          if (updateError) {
            console.error('🔍 DEBUG - StripeCheckoutWrapper - Error updating order with shipping address:', updateError);
          } else {
            console.log('🔍 DEBUG - StripeCheckoutWrapper - Successfully updated order with shipping address');

            // Verify the update by fetching the order again
            const { data: verifyData, error: verifyError } = await supabase
              .from('stripe_orders')
              .select('shipping_address')
              .eq('id', orderData.id)
              .single();

            if (verifyError) {
              console.error('🔍 DEBUG - StripeCheckoutWrapper - Error verifying order update:', verifyError);
            } else {
              console.log('🔍 DEBUG - StripeCheckoutWrapper - Verified shipping address in database:', JSON.stringify(verifyData.shipping_address, null, 2));
            }

            // Clear the localStorage after successful update
            localStorage.removeItem('last_shipping_address');
            console.log('🔍 DEBUG - StripeCheckoutWrapper - Cleared shipping address from localStorage');
          }
        } else {
          console.log('No order found for payment intent:', paymentIntentId);
        }
      }
    } catch (error) {
      console.error('Error processing shipping address:', error);
    }

    if (onSuccess) {
      onSuccess(paymentIntentId);
    } else {
      navigate('/checkout/success');
    }
  };

  // Log client secret for debugging
  useEffect(() => {
    if (clientSecret) {
      console.log('StripeCheckoutWrapper - Client secret available:', !!clientSecret);
    } else {
      console.error('StripeCheckoutWrapper - No client secret provided');
    }
  }, [clientSecret]);

  return (
    <div className="w-full max-w-md mx-auto">
      <SimpleStripeCheckout
        clientSecret={clientSecret}
        onSuccess={handlePaymentSuccess}
        onCancel={onCancel}
      />
    </div>
  );
};
