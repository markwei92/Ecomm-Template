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
  toastEnabled = enabled;
};

// Override the toast functions
toast.success = (message: string, options?: any) => {
  if (toastEnabled) {
    return originalToast.success(message, options);
  }
  return null as any;
};

toast.error = (message: string, options?: any) => {
  if (toastEnabled) {
    return originalToast.error(message, options);
  }
  return null as any;
};

toast.info = (message: string, options?: any) => {
  if (toastEnabled) {
    return originalToast.info(message, options);
  }
  return null as any;
};

toast.warn = (message: string, options?: any) => {
  if (toastEnabled) {
    return originalToast.warn(message, options);
  }
  return null as any;
};

// Also add loading override
const originalLoading = toast.loading;
toast.loading = (message: string, options?: any) => {
  if (toastEnabled) {
    return originalLoading(message, options);
  }
  return null as any;
};

export default toast;
