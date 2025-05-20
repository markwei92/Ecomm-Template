import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Loader } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { loginUser } from '../services/authService';
import { signInWithEmail } from '../services/adminAuthService';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    console.log('Attempting login with:', { email });

    try {
      // First try with the admin auth service (this should always work)
      console.log('Using admin auth service for login');
      let result = await signInWithEmail(email, password);

      if (!result.success) {
        console.log('Admin login failed, falling back to hybrid login');

        // Fall back to our custom login function with priority for custom auth
        console.log('Using custom login function with priority for custom auth');
        result = await loginUser({
          email,
          password
        }, false); // false means prioritize custom auth
      } else {
        console.log('Admin login successful:', result.user);
      }

      if (result.success) {
        console.log('Login successful:', result.user, result.isSupabaseAuth ? 'using Supabase Auth' : 'using custom auth');

        // Manually trigger a storage event to update the auth context
        // This is needed because the storage event only fires for other tabs
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'user',
          newValue: localStorage.getItem('user')
        }));

        toast.success('Login successful!');
        handleClose();
        navigate('/account', { replace: true });
      } else {
        throw new Error(result.message || 'Login failed. Please check your credentials and try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Invalid login credentials. Please check your email and password and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpClick = () => {
    onClose();
    navigate('/signup');
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container for centering */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title as="h3" className="text-xl font-semibold">
              Sign In
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-2 border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-2 border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white rounded-md py-2 px-4 text-sm font-medium hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

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
                    setError(error.message);
                  }}
                />
              </div>
            </div>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleSignUpClick}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};