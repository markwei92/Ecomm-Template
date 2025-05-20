import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { registerUser } from '../services/authService';
import { registerUserWithAdmin } from '../services/adminAuthService';
import { useLogoSettings } from '../hooks/useLogoSettings';
import { SuccessModal } from '../components/SuccessModal';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch logo settings
  const { logoSettings, titleSettings, isLoading: isLogoLoading } = useLogoSettings();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // First, test the Supabase connection to make sure it's working
      try {
        const { data: testData, error: testError } = await supabase.from('products').select('count');
        if (testError) {
          console.error('Supabase connection test failed:', testError);
          throw new Error('Unable to connect to the database. Please try again later.');
        }
        console.log('Supabase connection test successful');
      } catch (testError: any) {
        console.error('Supabase connection test exception:', testError);
        setErrors({
          ...errors,
          email: 'Unable to connect to the database. Please try again later.'
        });
        setIsSubmitting(false);
        return;
      }

      // First try with the admin API (this should always work)
      console.log('Using admin API for registration');

      const adminResult = await registerUserWithAdmin({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      });

      console.log('Admin registration result:', adminResult);

      if (adminResult.success) {
        // Registration successful with admin API
        console.log('Registration successful with admin API');

        // Show success modal instead of alert
        setShowSuccessModal(true);
        return;
      }

      // If admin registration fails, fall back to the hybrid method
      console.log('Admin registration failed, falling back to hybrid method');

      const result = await registerUser({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      });

      console.log('Hybrid registration result:', result);

      if (result.success) {
        // Registration successful
        console.log('Registration successful with ' + (result.isSupabaseAuth ? 'Supabase Auth' : 'custom auth'));

        // Show success modal instead of alert
        setShowSuccessModal(true);
        return;
      } else {
        // Both registration methods failed
        throw new Error(adminResult.message || result.message || 'Registration failed');
      }
    } catch (error: any) {
      // Log detailed error information
      console.error('Signup error details:', {
        message: error.message,
        name: error.name,
        status: error.status,
        statusText: error.statusText,
        stack: error.stack,
        fullError: error
      });

      // Provide more detailed error messages
      let errorMessage = 'An error occurred during signup. Please try again.';

      if (error.message) {
        // Handle specific error cases
        if (error.message.includes('User already registered')) {
          errorMessage = 'This email is already registered. Please use a different email or try logging in.';
        } else if (error.message.includes('Database error')) {
          errorMessage = 'There was a problem creating your account. Please try again later.';

          // Try to get more specific database error information
          console.log('Database error detected. Checking for details...');

          // Log the full error object for debugging
          console.dir(error);
        } else if (error.message.includes('500')) {
          errorMessage = 'The server encountered an error. Please try again later or contact support.';
        } else {
          // Use the actual error message
          errorMessage = error.message;
        }
      }

      // Display error to user
      setErrors({
        ...errors,
        email: errorMessage
      });

      // Alert for debugging in development
      if (import.meta.env.DEV) {
        console.log('Development environment detected, showing detailed error');
        alert(`Signup Error (Dev Only): ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        title="Account Created Successfully!"
        message="Your account has been created. You can now log in with your credentials."
        buttonText="Go to Login"
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/login');
        }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-4">
        {isLogoLoading ? (
          <div className="mx-auto h-16 w-16 bg-gray-200 animate-pulse rounded"></div>
        ) : logoSettings.image_url ? (
          <img
            src={logoSettings.image_url}
            alt={logoSettings.alt_text}
            className="mx-auto h-16 w-auto object-contain"
            onError={(e) => {
              // If image fails to load, show default
              const target = e.target as HTMLImageElement;
              target.onerror = null; // Prevent infinite loop
              target.src = "https://raw.githubusercontent.com/stackblitz/stackblitz-icons/main/public/emoji-smile-sunglasses.png";
            }}
          />
        ) : (
          <img
            src="https://raw.githubusercontent.com/stackblitz/stackblitz-icons/main/public/emoji-smile-sunglasses.png"
            alt="FunnyJokeTees Logo"
            className="mx-auto h-16 w-auto"
          />
        )}
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join our community of t-shirt enthusiasts
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <div className="mt-1">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`
                      appearance-none block w-full px-3 py-2 border rounded-md shadow-sm
                      placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm
                      ${errors.firstName ? 'border-red-300' : 'border-gray-300'}
                    `}
                  />
                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <div className="mt-1">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`
                      appearance-none block w-full px-3 py-2 border rounded-md shadow-sm
                      placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm
                      ${errors.lastName ? 'border-red-300' : 'border-gray-300'}
                    `}
                  />
                  {errors.lastName && (
                    <p className="mt-2 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`
                    appearance-none block w-full px-3 py-2 border rounded-md shadow-sm
                    placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm
                    ${errors.email ? 'border-red-300' : 'border-gray-300'}
                  `}
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`
                    appearance-none block w-full px-3 py-2 border rounded-md shadow-sm
                    placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm
                    ${errors.password ? 'border-red-300' : 'border-gray-300'}
                  `}
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`
                    appearance-none block w-full px-3 py-2 border rounded-md shadow-sm
                    placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm
                    ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'}
                  `}
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  w-full flex justify-center py-2 px-4 border border-transparent rounded-md
                  shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black
                  ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}
                `}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <GoogleSignInButton
                  mode="signup"
                  onError={(error) => {
                    setErrors({
                      ...errors,
                      general: error.message
                    });
                  }}
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};