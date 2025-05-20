import React, { useState, useEffect } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { useAuth } from '../context/AuthContext';
import { StripeElementsProvider, StripeElementsCheckout } from './StripeElementsCheckout';
import { Loader } from 'lucide-react';

interface UserData {
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

export const DelayedStripeElements: React.FC<{
  clientSecret: string;
  onSuccess?: (paymentIntentId: string) => void;
  onCancel?: () => void;
}> = ({ clientSecret, onSuccess, onCancel }) => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching user data for delayed rendering...');

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
        setUserData({
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          email: user.email || '',
          phone: profile?.phone || '',
          defaultAddress: address ? {
            street: address.street || '',
            city: address.city || '',
            state: address.state || '',
            postalCode: address.postal_code || '',
            country: address.country || 'US'
          } : null
        });

        console.log('User data loaded:', {
          profile,
          address
        });
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

  return (
    <StripeElementsProvider clientSecret={clientSecret}>
      <StripeElementsCheckout
        onSuccess={onSuccess}
        onCancel={onCancel}
        initialUserData={userData}
      />
    </StripeElementsProvider>
  );
};
