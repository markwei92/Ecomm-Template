import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { useLogoSettings } from '../hooks/useLogoSettings';
import { SuccessModal } from '../components/SuccessModal';
import { resetPasswordWithSQL, checkUserExists } from '../services/passwordResetService';

interface FormData {
  email: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface FormErrors {
  email?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

const ForgotPasswordPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [useDirectReset, setUseDirectReset] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch logo settings
  const { logoSettings, titleSettings, isLoading: isLogoLoading } = useLogoSettings();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (useDirectReset) {
      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required';
        isValid = false;
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
        isValid = false;
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
        isValid = false;
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (useDirectReset) {
        // First check if the user exists
        const userCheck = await checkUserExists(formData.email);

        if (!userCheck.success) {
          console.error('Error checking if user exists:', userCheck.error);
        }

        if (!userCheck.exists) {
          // Don't reveal that the user doesn't exist for security reasons
          // Instead, show a generic success message
          setSuccessMessage(`If your account exists, your password has been reset. You can now log in with your new password.`);
          setShowSuccessModal(true);
          return;
        }

        // Use direct password reset method
        const result = await resetPasswordWithSQL(formData.email, formData.newPassword || '');

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to reset password');
        }

        // Set success message for the modal
        setSuccessMessage(`Your password has been reset successfully. You can now log in with your new password.`);

        // Show success modal
        setShowSuccessModal(true);
      } else {
        // Use email-based password reset
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          throw error;
        }

        // Set success message for the modal
        setSuccessMessage('If your email exists in our system, you will receive a password reset link shortly. Please check your inbox and spam folder.');

        // Show success modal
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);

      if (useDirectReset) {
        // Show specific error for direct reset
        let errorMessage = error.message;

        // Make error messages more user-friendly
        if (errorMessage.includes('User not found')) {
          errorMessage = 'Account not found. Please check your email address.';
        } else if (errorMessage.includes('permission denied')) {
          errorMessage = 'Permission denied. Please try again later or contact support.';
        }

        setErrors({
          general: `Failed to reset password: ${errorMessage}`
        });

        toast.error('Failed to reset password. Please try again or contact support.', {
          position: 'bottom-right',
          autoClose: 5000
        });
      } else {
        // Don't show specific errors to prevent email enumeration for email method
        setErrors({
          general: 'If your email exists in our system, you will receive a password reset link shortly.'
        });

        toast.info('If your email exists in our system, you will receive a password reset link shortly.', {
          position: 'bottom-right',
          autoClose: 5000
        });
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
        title={useDirectReset ? "Password Reset Successful" : "Password Reset Email Sent"}
        message={successMessage}
        buttonText="Return to Login"
        onClose={() => {
          setShowSuccessModal(false);
          window.location.href = '/login';
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
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {useDirectReset
            ? "Enter your email and create a new password to reset your account immediately."
            : "Enter your email address and we'll send you a link to reset your password."}
        </p>
        <p className="mt-1 text-center text-xs text-gray-500">
          {useDirectReset
            ? "This method works even if you're not receiving emails from us."
            : "You'll need to check your email to complete the password reset."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errors.general && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-700">{errors.general}</p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Reset method:</span>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setUseDirectReset(false)}
                  className={`px-3 py-1 text-sm rounded-l-md ${!useDirectReset
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Email Link
                </button>
                <button
                  type="button"
                  onClick={() => setUseDirectReset(true)}
                  className={`px-3 py-1 text-sm rounded-r-md ${useDirectReset
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Direct Reset
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {useDirectReset
                ? "Direct reset will immediately change your password without sending an email. This is recommended if you're not receiving emails."
                : "Email link will send a password reset link to your email address. This may not work if your email provider is blocking messages."}
            </p>
          </div>

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
                  className={`appearance-none block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm`}
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {useDirectReset && (
              <>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required={useDirectReset}
                      value={formData.newPassword}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border ${errors.newPassword ? 'border-red-300' : 'border-gray-300'
                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm`}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {errors.newPassword && (
                      <p className="mt-2 text-sm text-red-600">{errors.newPassword}</p>
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
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required={useDirectReset}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm`}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </>
            )}

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
                    <Loader className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    {useDirectReset ? 'Resetting...' : 'Sending...'}
                  </>
                ) : (
                  useDirectReset ? 'Reset Password' : 'Send Reset Link'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Remember your password?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="font-medium text-black hover:text-gray-900"
              >
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
