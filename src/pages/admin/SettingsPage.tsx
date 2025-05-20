import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from '../../utils/toastInterceptor';

import { useToastSettings } from '../../context/ToastSettingsContext';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  amount: number;
  valid_from: string;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  stripe_id: string;
}

export const SettingsPage: React.FC = () => {
  const { toastSettings, updateToastSettings } = useToastSettings();
  const [baseShippingPrice, setBaseShippingPrice] = useState('5.00');
  const [additionalItemPrice, setAdditionalItemPrice] = useState('2.50');
  const [isLoadingShipping, setIsLoadingShipping] = useState(true);
  const [isSavingShipping, setIsSavingShipping] = useState(false);
  const [isSavingToastSettings, setIsSavingToastSettings] = useState(false);

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed_amount',
    amount: '',
    validFrom: new Date().toISOString().split('T')[0],
    expiresAt: '',
    usageLimit: ''
  });

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCoupons();
  }, []);



  const fetchSettings = async () => {
    try {
      // Fetch shipping configuration from our new endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shipping-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch shipping configuration');
      }

      const data = await response.json();
      console.log('Fetched shipping config:', data);

      // Convert from cents to dollars for display
      setBaseShippingPrice((data.base_shipping_cost / 100).toFixed(2));
      setAdditionalItemPrice((data.additional_item_cost / 100).toFixed(2));
    } catch (error) {
      console.error('Error fetching shipping price:', error);
      toast.error('Failed to load shipping price');
    } finally {
      setIsLoadingShipping(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  const handleSaveShippingPrice = async () => {
    try {
      setIsSavingShipping(true);
      const basePrice = parseFloat(baseShippingPrice);
      const additionalPrice = parseFloat(additionalItemPrice);

      if (isNaN(basePrice) || basePrice < 0 || isNaN(additionalPrice) || additionalPrice < 0) {
        throw new Error('Invalid shipping price');
      }

      // Convert from dollars to cents for storage
      const basePriceCents = Math.round(basePrice * 100);
      const additionalPriceCents = Math.round(additionalPrice * 100);

      // Update shipping configuration using our new endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shipping-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          base_shipping_cost: basePriceCents,
          additional_item_cost: additionalPriceCents
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update shipping configuration');
      }

      toast.success('Shipping configuration updated successfully');
    } catch (error: any) {
      console.error('Error saving shipping configuration:', error);
      toast.error(error.message || 'Failed to update shipping configuration');
    } finally {
      setIsSavingShipping(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    const session = await supabase.auth.getSession();
    if (!session.data.session?.access_token) {
      toast.error('Please log in to create coupons');
      return;
    }

    try {
      setIsCreatingCoupon(true);

      // Validate inputs
      if (!newCoupon.code || !newCoupon.amount) {
        throw new Error('Please fill in all required fields');
      }

      const amount = parseFloat(newCoupon.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid discount amount');
      }

      if (newCoupon.type === 'percentage' && amount > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }

      // Create coupon in Stripe
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({
          code: newCoupon.code,
          type: newCoupon.type,
          amount: amount,
          valid_from: new Date(newCoupon.validFrom).toISOString(),
          expires_at: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : null,
          usage_limit: newCoupon.usageLimit ? parseInt(newCoupon.usageLimit) : null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create coupon');
      }

      const { stripe_id } = await response.json();

      // Save coupon in Supabase
      const { error: dbError } = await supabase
        .from('coupons')
        .insert({
          stripe_id,
          code: newCoupon.code,
          type: newCoupon.type,
          amount: amount,
          valid_from: new Date(newCoupon.validFrom).toISOString(),
          expires_at: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : null,
          usage_limit: newCoupon.usageLimit ? parseInt(newCoupon.usageLimit) : null
        });

      if (dbError) throw dbError;

      toast.success('Coupon created successfully');

      // Reset form and refresh coupons list
      setNewCoupon({
        code: '',
        type: 'percentage',
        amount: '',
        validFrom: new Date().toISOString().split('T')[0],
        expiresAt: '',
        usageLimit: ''
      });
      fetchCoupons();
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      toast.error(error.message || 'Failed to create coupon');
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string, stripeId: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    const session = await supabase.auth.getSession();
    if (!session.data.session?.access_token) {
      toast.error('Please log in to delete coupons');
      return;
    }

    try {
      // Delete from Stripe
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({ stripe_id: stripeId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete coupon from Stripe');
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (dbError) throw dbError;

      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      toast.error(error.message || 'Failed to delete coupon');
    }
  };

  const handleToggleToastNotifications = async () => {
    try {
      setIsSavingToastSettings(true);
      await updateToastSettings({
        enabled: !toastSettings.enabled
      });
    } catch (error) {
      console.error('Error toggling toast notifications:', error);
    } finally {
      setIsSavingToastSettings(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Toast Notifications Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-900">Toast Notifications</h3>
            <p className="text-sm text-gray-500 mt-1">
              Enable or disable toast notifications that appear when actions are performed.
              <br />
              <span className="italic">This is useful for debugging but can be turned off in production.</span>
            </p>
          </div>
          <button
            onClick={handleToggleToastNotifications}
            disabled={isSavingToastSettings}
            className="relative inline-flex items-center"
          >
            {toastSettings.enabled ? (
              <>
                <ToggleRight className="h-8 w-8 text-green-600" />
                <span className="ml-2 text-sm font-medium text-green-600">Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-8 w-8 text-gray-400" />
                <span className="ml-2 text-sm font-medium text-gray-500">Disabled</span>
              </>
            )}
            {isSavingToastSettings && (
              <Loader className="absolute -top-1 -right-6 h-4 w-4 animate-spin text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Shipping Price Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Shipping Configuration</h2>
        <div className="max-w-xs">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Shipping Cost ($)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  value={baseShippingPrice}
                  onChange={(e) => setBaseShippingPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  disabled={isLoadingShipping}
                  className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Item Cost ($)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  value={additionalItemPrice}
                  onChange={(e) => setAdditionalItemPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  disabled={isLoadingShipping}
                  className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveShippingPrice}
              disabled={isLoadingShipping || isSavingShipping}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {isSavingShipping ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Coupon Management Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Discount Coupon Management</h2>

        {/* Create Coupon Form */}
        <form onSubmit={handleCreateCoupon} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coupon Code
              </label>
              <input
                type="text"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Type
              </label>
              <select
                value={newCoupon.type}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, type: e.target.value as 'percentage' | 'fixed_amount' }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Amount
              </label>
              <input
                type="number"
                value={newCoupon.amount}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, amount: e.target.value }))}
                min="0"
                step={newCoupon.type === 'percentage' ? '1' : '0.01'}
                max={newCoupon.type === 'percentage' ? '100' : undefined}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid From
              </label>
              <input
                type="date"
                value={newCoupon.validFrom}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, validFrom: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date
              </label>
              <input
                type="date"
                value={newCoupon.expiresAt}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, expiresAt: e.target.value }))}
                min={newCoupon.validFrom}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                value={newCoupon.usageLimit}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, usageLimit: e.target.value }))}
                min="1"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isCreatingCoupon}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {isCreatingCoupon ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Coupon
                </>
              )}
            </button>
          </div>
        </form>

        {/* Coupons List */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Active Coupons</h3>

          {isLoadingCoupons ? (
            <div className="flex justify-center py-8">
              <Loader className="animate-spin h-8 w-8 text-gray-400" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No coupons found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid Period
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {coupon.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {coupon.type === 'percentage' ? (
                          `${coupon.amount}%`
                        ) : (
                          `$${coupon.amount.toFixed(2)}`
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>From: {new Date(coupon.valid_from).toLocaleDateString()}</div>
                        {coupon.expires_at && (
                          <div>Until: {new Date(coupon.expires_at).toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {coupon.times_used} / {coupon.usage_limit || '∞'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.stripe_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};