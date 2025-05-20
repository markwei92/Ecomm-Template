import React, { useState, useEffect } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  // Make avatar_url optional to handle databases where this column might not exist
  avatar_url?: string;
}

export const ProfileForm: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    id: '',
    first_name: '',
    last_name: '',
    email: user?.email || '',
    phone: ''
    // Removed avatar_url to avoid schema issues
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found, create a new one
          const newProfile = {
            id: user.id,
            first_name: '',
            last_name: '',
            email: user.email || '',
            phone: ''
            // Removed avatar_url to avoid schema issues
          };

          setProfile(newProfile);
        } else {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load profile');
        }
      } else if (data) {
        // Make sure email is always set from user object
        setProfile({
          ...data,
          email: user.email || data.email || ''
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    // Reset form to original values
    fetchProfile();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to update your profile');
      return;
    }

    try {
      setLoading(true);

      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking profile:', checkError);
      }

      let operation;
      // Create update data without avatar_url to avoid schema issues
      const updateData = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        updated_at: new Date().toISOString()
      };

      if (existingProfile) {
        // Update existing profile
        console.log('Updating existing profile');
        operation = supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);
      } else {
        // Insert new profile
        console.log('Creating new profile');
        operation = supabase
          .from('profiles')
          .insert({
            id: user.id,
            ...updateData
          });
      }

      const { error } = await operation;

      if (error) {
        console.error('Error updating profile:', error);
        toast.error(`Failed to update profile: ${error.message}`);
      } else {
        toast.success('Profile updated successfully');
        // Refresh the profile data
        fetchProfile();
        // Exit editing mode
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`An unexpected error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
        {!isEditing && (
          <button
            type="button"
            onClick={handleEditClick}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={profile.first_name}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm ${!isEditing ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={profile.last_name}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm ${!isEditing ? 'bg-gray-50' : ''}`}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={profile.email}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-gray-50"
              readOnly
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed. This is your login email.</p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              readOnly={!isEditing}
              className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm ${!isEditing ? 'bg-gray-50' : ''}`}
              placeholder="+1 (555) 987-6543"
            />
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
