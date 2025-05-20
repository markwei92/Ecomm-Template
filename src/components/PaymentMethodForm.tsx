import React, { useState, useEffect } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface PaymentMethod {
  id?: string;
  user_id: string;
  payment_type: string;
  cardholder_name: string;
  last_four: string;
  expiry_date: string;
  is_default: boolean;
}

export const PaymentMethodForm: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<PaymentMethod>({
    user_id: '',
    payment_type: 'card',
    cardholder_name: '',
    last_four: '',
    expiry_date: '',
    is_default: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
      setCurrentPaymentMethod(prev => ({ ...prev, user_id: user.id }));
    }
  }, [user]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);

      if (!user) return;

      const { data, error } = await supabase
        .from('user_payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching payment methods:', error);
        toast.error('Failed to load payment methods');
      } else if (data) {
        setPaymentMethods(data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    if (name === 'cardNumber') {
      // Format card number with spaces
      const formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      setCardNumber(formattedValue);

      // Extract last four digits
      const lastFour = value.replace(/\s/g, '').slice(-4);
      if (lastFour.length === 4) {
        setCurrentPaymentMethod(prev => ({ ...prev, last_four: lastFour }));
      }
    } else {
      setCurrentPaymentMethod(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to save a payment method');
      return;
    }

    // Validate required fields
    if (!currentPaymentMethod.cardholder_name || !currentPaymentMethod.expiry_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate card number (simple check)
    if (!isEditing && cardNumber.replace(/\s/g, '').length < 16) {
      toast.error('Please enter a valid card number');
      return;
    }

    try {
      setLoading(true);

      let paymentData;
      let operation;

      if (currentPaymentMethod.id) {
        // Update existing payment method
        console.log('Updating existing payment method:', currentPaymentMethod.id);
        paymentData = {
          cardholder_name: currentPaymentMethod.cardholder_name,
          expiry_date: currentPaymentMethod.expiry_date,
          payment_type: currentPaymentMethod.payment_type,
          is_default: currentPaymentMethod.is_default,
          updated_at: new Date().toISOString()
        };

        operation = supabase
          .from('user_payment_methods')
          .update(paymentData)
          .eq('id', currentPaymentMethod.id)
          .eq('user_id', user.id);
      } else {
        // Insert new payment method
        console.log('Creating new payment method');
        // Extract last four digits from card number
        const lastFour = cardNumber.replace(/\s/g, '').slice(-4);

        paymentData = {
          ...currentPaymentMethod,
          user_id: user.id,
          last_four: lastFour
        };

        operation = supabase
          .from('user_payment_methods')
          .insert(paymentData);
      }

      const { error } = await operation;

      if (error) {
        console.error('Error saving payment method:', error);
        toast.error(`Failed to save payment method: ${error.message}`);
      } else {
        toast.success('Payment method saved successfully');
        fetchPaymentMethods();
        resetForm();
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`An unexpected error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setIsEditing(false);
    }
  };

  const handleEdit = (paymentMethod: PaymentMethod) => {
    setCurrentPaymentMethod(paymentMethod);
    setCardNumber(`•••• •••• •••• ${paymentMethod.last_four}`);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_payment_methods')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting payment method:', error);
        toast.error('Failed to delete payment method');
      } else {
        toast.success('Payment method deleted successfully');
        fetchPaymentMethods();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPaymentMethod({
      user_id: user?.id || '',
      payment_type: 'card',
      cardholder_name: '',
      last_four: '',
      expiry_date: '',
      is_default: false
    });
    setCardNumber('');
    setIsEditing(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>

      {paymentMethods.length > 0 && (
        <div className="mb-6 space-y-4">
          {paymentMethods.map(method => (
            <div key={method.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {method.payment_type === 'card' ? 'Credit Card' : method.payment_type}
                    {method.is_default && <span className="text-xs bg-gray-100 px-2 py-1 rounded-full ml-2">Default</span>}
                  </p>
                  <p className="text-sm text-gray-600">•••• •••• •••• {method.last_four}</p>
                  <p className="text-sm text-gray-600">{method.cardholder_name}</p>
                  <p className="text-sm text-gray-600">Expires: {method.expiry_date}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(method)}
                    className="text-sm text-gray-600 hover:text-black"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(method.id!)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
          <div className="sm:col-span-2">
            <label htmlFor="cardholder_name" className="block text-sm font-medium text-gray-700">
              Cardholder Name
            </label>
            <input
              type="text"
              id="cardholder_name"
              name="cardholder_name"
              value={currentPaymentMethod.cardholder_name}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">
              Card Number
            </label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={cardNumber}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              required={!isEditing}
              disabled={isEditing}
            />
            {isEditing && (
              <p className="mt-1 text-xs text-gray-500">Card number cannot be edited for security reasons.</p>
            )}
          </div>

          <div>
            <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700">
              Expiration Date
            </label>
            <input
              type="text"
              id="expiry_date"
              name="expiry_date"
              value={currentPaymentMethod.expiry_date}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="MM/YY"
              maxLength={5}
              required
            />
          </div>

          <div>
            <label htmlFor="payment_type" className="block text-sm font-medium text-gray-700">
              Card Type
            </label>
            <select
              id="payment_type"
              name="payment_type"
              value={currentPaymentMethod.payment_type}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            >
              <option value="card">Credit Card</option>
              <option value="debit">Debit Card</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center">
              <input
                id="is_default"
                name="is_default"
                type="checkbox"
                checked={currentPaymentMethod.is_default}
                onChange={handleChange}
                className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
              />
              <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">
                Set as default payment method
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Payment Method' : 'Add Payment Method')}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
