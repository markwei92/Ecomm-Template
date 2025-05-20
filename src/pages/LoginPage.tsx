import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { testAuth } from '../utils/testAuth';
import { loginUser } from '../services/authService';
import { signInWithEmail } from '../services/adminAuthService';
import { useLogoSettings } from '../hooks/useLogoSettings';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch logo settings
  const { logoSettings, titleSettings, isLoading: isLogoLoading } = useLogoSettings();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
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
    setErrors({});

    try {
      console.log('Attempting login with:', { email: formData.email });

      // First try with the admin auth service (this should always work)
      console.log('Using admin auth service for login');
      let result = await signInWithEmail(formData.email, formData.password);

      if (!result.success) {
        console.log('Admin login failed, falling back to hybrid login');

        // Fall back to our custom login function with priority for custom auth
        console.log('Using custom login function with priority for custom auth');
        result = await loginUser({
          email: formData.email,
          password: formData.password
        }, false); // false means prioritize custom auth
      } else {
        console.log('Admin login successful:', result.user);
      }

      if (result.success) {
        console.log('Login successful:', result.user);

        // Manually trigger a storage event to update the auth context
        // This is needed because the storage event only fires for other tabs
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'user',
          newValue: localStorage.getItem('user')
        }));

        // Check for pending cart action
        const pendingCartAction = sessionStorage.getItem('pendingCartAction');
        if (pendingCartAction) {
          sessionStorage.removeItem('pendingCartAction');
          toast.success('Item added to cart!');
        }

        // Show a small toast notification
        toast.success('Login successful!', {
          position: 'bottom-right',
          autoClose: 2000
        });

        // Navigate directly to the intended destination without showing success modal
        const from = location.state?.from || '/account';
        navigate(from, {
          replace: true,
          state: { fresh: true }
        });
        return;
      }

      // If login fails, show error
      throw new Error(result.message || 'Login failed. Please check your credentials and try again.');
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors({
        general: error.message || 'Invalid login credentials. Please check your email and password and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-black hover:text-gray-800">
            Sign up
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errors.general && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
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
                  autoComplete="current-password"
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

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-black hover:text-gray-800">
                  Forgot your password?
                </Link>
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
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
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
                  mode="signin"
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