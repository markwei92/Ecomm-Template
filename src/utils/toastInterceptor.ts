import { toast } from 'react-toastify';

// Store the original toast functions
const originalToast = {
  success: toast.success,
  error: toast.error,
  info: toast.info,
  warn: toast.warn
};

// Flag to track if toast notifications are enabled
let toastEnabled = true;

// Function to set the toast enabled state
export const setToastEnabled = (enabled: boolean) => {
  console.log(`Toast notifications being set to: ${enabled ? 'enabled' : 'disabled'}`);
  toastEnabled = enabled;
  // Force to true for debugging
  toastEnabled = true;
  console.log(`Toast notifications are now: ${toastEnabled ? 'enabled' : 'disabled'}`);
};

// Override the toast functions
toast.success = (message: string, options?: any) => {
  console.log('Toast success called with message:', message);
  if (toastEnabled) {
    console.log('Toast success is enabled, showing toast');
    return originalToast.success(message, options);
  }
  console.log('Toast notification suppressed (disabled):', message);
  return null as any;
};

toast.error = (message: string, options?: any) => {
  console.log('Toast error called with message:', message);
  if (toastEnabled) {
    console.log('Toast error is enabled, showing toast');
    return originalToast.error(message, options);
  }
  console.log('Toast notification suppressed (disabled):', message);
  return null as any;
};

toast.info = (message: string, options?: any) => {
  console.log('Toast info called with message:', message);
  if (toastEnabled) {
    console.log('Toast info is enabled, showing toast');
    return originalToast.info(message, options);
  }
  console.log('Toast notification suppressed (disabled):', message);
  return null as any;
};

toast.warn = (message: string, options?: any) => {
  console.log('Toast warn called with message:', message);
  if (toastEnabled) {
    console.log('Toast warn is enabled, showing toast');
    return originalToast.warn(message, options);
  }
  console.log('Toast notification suppressed (disabled):', message);
  return null as any;
};

// Also add debugging for loading
const originalLoading = toast.loading;
toast.loading = (message: string, options?: any) => {
  console.log('Toast loading called with message:', message);
  if (toastEnabled) {
    console.log('Toast loading is enabled, showing toast');
    return originalLoading(message, options);
  }
  console.log('Toast loading notification suppressed (disabled):', message);
  return null as any;
};

export default toast;
