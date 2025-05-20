import React, { useState, useEffect } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { ConfirmationDialog } from './ConfirmationDialog';
import { getStatesByCountry } from '../utils/countryStates';

interface Address {
  id?: string;
  user_id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export const AddressForm: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [currentAddress, setCurrentAddress] = useState<Address>({
    user_id: '',
    name: '', // Keep this for database compatibility
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    is_default: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAddresses();
      setCurrentAddress(prev => ({ ...prev, user_id: user.id }));
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);

      if (!user) return;

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching addresses:', error);
        toast.error('Failed to load addresses');
      } else if (data) {
        setAddresses(data);
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

    setCurrentAddress(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to save an address');
      return;
    }

    // Validate required fields
    if (!currentAddress.street || !currentAddress.city || !currentAddress.postal_code) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // If this is the first address or is marked as default, handle default status
      if (addresses.length === 0 || currentAddress.is_default) {
        // If this is a new default address, update all other addresses to not be default
        if (addresses.length > 0 && currentAddress.is_default) {
          console.log('Setting other addresses to non-default');
          const { error: updateError } = await supabase
            .from('user_addresses')
            .update({ is_default: false })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Error updating other addresses:', updateError);
          }
        }
      }

      // Prepare address data
      const addressData = {
        ...currentAddress,
        user_id: user.id,
        // If this is the first address or will be the only address, force it to be default
        is_default: addresses.length === 0 || (addresses.length === 1 && currentAddress.id === addresses[0].id) ? true : currentAddress.is_default
      };

      console.log('Saving address with data:', addressData);

      let result;
      if (currentAddress.id) {
        // Update existing address
        console.log('Updating existing address:', currentAddress.id);
        result = await supabase
          .from('user_addresses')
          .update({
            name: addressData.name,
            street: addressData.street,
            city: addressData.city,
            state: addressData.state,
            postal_code: addressData.postal_code,
            country: addressData.country,
            is_default: addressData.is_default,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentAddress.id)
          .eq('user_id', user.id);
      } else {
        // Insert new address
        console.log('Creating new address');
        result = await supabase
          .from('user_addresses')
          .insert(addressData);
      }

      const { error } = result;

      if (error) {
        console.error('Error saving address:', error);
        toast.error(`Failed to save address: ${error.message}`);
      } else {
        toast.success('Address saved successfully');
        fetchAddresses();
        resetForm();
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`An unexpected error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setIsEditing(false);
      setIsAddingNew(false);
    }
  };

  const handleEdit = (address: Address) => {
    setCurrentAddress(address);
    setIsEditing(true);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    resetForm();
    setIsAddingNew(true);
  };

  const handleDeleteClick = (id: string) => {
    setAddressToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;

    try {
      setLoading(true);

      // First, check if the address to be deleted is the default one
      const addressObj = addresses.find(addr => addr.id === addressToDelete);
      const isDefaultAddress = addressObj?.is_default || false;

      // Delete the address
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressToDelete);

      if (error) {
        console.error('Error deleting address:', error);
        toast.error('Failed to delete address');
        return;
      }

      // If the deleted address was the default one and there are other addresses
      if (isDefaultAddress && addresses.length > 1) {
        // Get the remaining addresses (excluding the one we just deleted)
        const remainingAddresses = addresses.filter(addr => addr.id !== addressToDelete);

        if (remainingAddresses.length > 0) {
          // Set the first remaining address as the default
          const newDefaultAddressId = remainingAddresses[0].id;

          console.log('Setting new default address:', newDefaultAddressId);

          const { error: updateError } = await supabase
            .from('user_addresses')
            .update({ is_default: true })
            .eq('id', newDefaultAddressId);

          if (updateError) {
            console.error('Error setting new default address:', updateError);
            toast.error('Failed to update default address');
          } else {
            console.log('New default address set successfully');
          }
        }
      }

      toast.success('Address deleted successfully');
      // Refresh the addresses list
      fetchAddresses();
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
      setShowDeleteConfirmation(false);
      setAddressToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setAddressToDelete(null);
  };

  const resetForm = () => {
    setCurrentAddress({
      user_id: user?.id || '',
      name: '', // Keep this for database compatibility
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
      is_default: false
    });
    setIsEditing(false);
    setIsAddingNew(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Shipping Addresses</h3>
        {!isEditing && !isAddingNew && (
          <button
            type="button"
            onClick={handleAddNew}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Add New Address
          </button>
        )}
      </div>

      {addresses.length > 0 && !isAddingNew && (
        <div className="mb-6">
          {addresses.map(address => (
            <div key={address.id} className={`border ${address.is_default ? 'border-gray-300' : 'border-gray-200'} rounded-md p-6 ${isEditing && currentAddress.id === address.id ? 'hidden' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{address.is_default && <span className="text-xs bg-gray-100 px-2 py-1 rounded-md mr-2">Default</span>} {address.street}</p>
                  <p className="text-sm text-gray-600">{address.city}, {address.state} {address.postal_code}</p>
                  <p className="text-sm text-gray-600">{address.country}</p>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => handleEdit(address)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(address.id!)}
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

      {/* Show message if no addresses and not already adding */}
      {addresses.length === 0 && !isAddingNew && !isEditing && (
        <div className="mb-6 text-center py-8">
          <p className="text-gray-500 mb-4">You don't have any saved addresses yet.</p>
          <button
            type="button"
            onClick={handleAddNew}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Add New Address
          </button>
        </div>
      )}

      {/* Only show the form when editing or adding a new address */}
      {(isEditing || isAddingNew) && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
            <div className="sm:col-span-2">
              <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                Street Address
              </label>
              <input
                type="text"
                id="street"
                name="street"
                value={currentAddress.street}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={currentAddress.city}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State / Province
              </label>
              <select
                id="state"
                name="state"
                value={currentAddress.state}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              >
                <option value="">Select State/Province</option>
                {getStatesByCountry(currentAddress.country).map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                Postal Code
              </label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={currentAddress.postal_code}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <select
                id="country"
                name="country"
                value={currentAddress.country}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center">
                <input
                  id="is_default"
                  name="is_default"
                  type="checkbox"
                  checked={currentAddress.is_default}
                  onChange={handleChange}
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">
                  Set as default address
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
              {loading ? 'Saving...' : (isEditing ? 'Update Address' : 'Add Address')}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Cancel
            </button>
          </div>
        </form>
      )}


      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
      />
    </div>
  );
};
