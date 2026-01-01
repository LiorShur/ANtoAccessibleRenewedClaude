/**
 * Error Messages Utility
 * Provides consistent, user-friendly error handling throughout the app
 * 
 * Access Nature - Phase 1: Pre-Beta Polish
 * Created: December 2025
 */

import { toast } from './toast.js';

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES = {
  // Firebase Auth errors
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email. Would you like to sign up?',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
  'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups for this site.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes and try again.',
  'auth/requires-recent-login': 'Please sign out and sign back in to perform this action.',
  
  // Firebase Firestore errors
  'permission-denied': 'You don\'t have permission to perform this action.',
  'not-found': 'The requested data was not found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please wait a moment and try again.',
  'failed-precondition': 'Operation failed. Please try again.',
  'aborted': 'Operation was cancelled. Please try again.',
  'out-of-range': 'Invalid data range.',
  'unimplemented': 'This feature is not yet available.',
  'internal': 'An internal error occurred. Please try again later.',
  'unavailable': 'Service temporarily unavailable. Please try again later.',
  'data-loss': 'Data may have been lost. Please contact support.',
  'unauthenticated': 'Please sign in to continue.',
  
  // Geolocation errors
  'geolocation/permission-denied': 'Location access denied. Please enable location in your browser settings.',
  'geolocation/position-unavailable': 'Unable to determine your location. Please try again.',
  'geolocation/timeout': 'Location request timed out. Please try again.',
  
  // Network errors
  'network/offline': 'You\'re offline. Please check your internet connection.',
  'network/timeout': 'Request timed out. Please check your connection and try again.',
  'network/server-error': 'Server error. Please try again later.',
  
  // Storage errors
  'storage/quota-exceeded': 'Storage is full. Please delete some saved routes.',
  'storage/unauthorized': 'Storage access denied.',
  'storage/canceled': 'Upload was cancelled.',
  'storage/unknown': 'An unknown storage error occurred.',
  
  // App-specific errors
  'tracking/already-active': 'Tracking is already active.',
  'tracking/not-active': 'No active tracking session.',
  'tracking/no-data': 'No route data to save.',
  'export/no-data': 'No data available to export.',
  'export/format-unsupported': 'This export format is not supported.',
  'survey/incomplete': 'Please fill in all required fields.',
  'route/not-found': 'Route not found.',
  'guide/not-found': 'Trail guide not found.',
  
  // Generic fallbacks
  'unknown': 'An unexpected error occurred. Please try again.',
  'default': 'Something went wrong. Please try again.'
};

/**
 * Error categories for icon/styling
 */
const ERROR_CATEGORIES = {
  auth: { icon: '🔐', color: '#f44336' },
  network: { icon: '📡', color: '#ff9800' },
  permission: { icon: '🚫', color: '#f44336' },
  storage: { icon: '💾', color: '#ff9800' },
  location: { icon: '📍', color: '#ff9800' },
  data: { icon: '📋', color: '#2196f3' },
  server: { icon: '🖥️', color: '#f44336' },
  unknown: { icon: '⚠️', color: '#ff9800' }
};

/**
 * Get error category from error code
 * @param {string} code - Error code
 * @returns {string} - Category name
 */
function getErrorCategory(code) {
  if (!code) return 'unknown';
  if (code.startsWith('auth/')) return 'auth';
  if (code.startsWith('network/')) return 'network';
  if (code.startsWith('storage/')) return 'storage';
  if (code.startsWith('geolocation/')) return 'location';
  if (['permission-denied', 'unauthenticated', 'unauthorized'].includes(code)) return 'permission';
  if (['unavailable', 'internal', 'data-loss'].includes(code)) return 'server';
  if (['not-found', 'already-exists', 'out-of-range'].includes(code)) return 'data';
  return 'unknown';
}

/**
 * Get user-friendly error message from error object or code
 * @param {Error|string|object} error - Error object, code string, or Firebase error
 * @returns {string} - User-friendly message
 */
export function getErrorMessage(error) {
  if (!error) return ERROR_MESSAGES.default;
  
  // Handle string error codes directly
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || ERROR_MESSAGES.default;
  }
  
  // Handle Firebase errors (have .code property)
  if (error.code) {
    return ERROR_MESSAGES[error.code] || error.message || ERROR_MESSAGES.default;
  }
  
  // Handle GeolocationPositionError
  if (error.PERMISSION_DENIED !== undefined) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return ERROR_MESSAGES['geolocation/permission-denied'];
      case error.POSITION_UNAVAILABLE:
        return ERROR_MESSAGES['geolocation/position-unavailable'];
      case error.TIMEOUT:
        return ERROR_MESSAGES['geolocation/timeout'];
      default:
        return ERROR_MESSAGES.default;
    }
  }
  
  // Handle standard Error objects
  if (error.message) {
    // Check if message contains known patterns
    if (error.message.includes('network') || error.message.includes('Network')) {
      return ERROR_MESSAGES['network/offline'];
    }
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return ERROR_MESSAGES['network/timeout'];
    }
    if (error.message.includes('permission') || error.message.includes('Permission')) {
      return ERROR_MESSAGES['permission-denied'];
    }
    if (error.message.includes('Target ID')) {
      return 'Database connection busy. Please try again.';
    }
    
    // Return the original message if it's reasonably short and user-friendly
    if (error.message.length < 100 && !error.message.includes('Error:')) {
      return error.message;
    }
  }
  
  return ERROR_MESSAGES.default;
}

/**
 * Show error to user via toast notification
 * @param {Error|string|object} error - Error to display
 * @param {object} options - Toast options
 */
export function showError(error, options = {}) {
  const message = getErrorMessage(error);
  const code = error?.code || 'unknown';
  const category = getErrorCategory(code);
  const { icon } = ERROR_CATEGORIES[category];
  
  console.error('❌ Error:', error);
  
  toast.error(`${icon} ${message}`, {
    duration: options.duration || 5000,
    ...options
  });
  
  return message;
}

/**
 * Show warning to user
 * @param {string} message - Warning message
 * @param {object} options - Toast options
 */
export function showWarning(message, options = {}) {
  toast.warning(`⚠️ ${message}`, {
    duration: options.duration || 4000,
    ...options
  });
}

/**
 * Show info message to user
 * @param {string} message - Info message
 * @param {object} options - Toast options
 */
export function showInfo(message, options = {}) {
  toast.info(`ℹ️ ${message}`, {
    duration: options.duration || 3000,
    ...options
  });
}

/**
 * Show success message to user
 * @param {string} message - Success message
 * @param {object} options - Toast options
 */
export function showSuccess(message, options = {}) {
  toast.success(`✅ ${message}`, {
    duration: options.duration || 3000,
    ...options
  });
}

/**
 * Handle async operation with automatic error display
 * @param {Function} asyncFn - Async function to execute
 * @param {object} options - Options
 * @returns {Promise<any>} - Result or null on error
 */
export async function handleAsync(asyncFn, options = {}) {
  const {
    loadingMessage = null,
    successMessage = null,
    errorMessage = null,
    showLoadingToast = false,
    rethrow = false
  } = options;
  
  let loadingToastId = null;
  
  try {
    if (showLoadingToast && loadingMessage) {
      loadingToastId = toast.info(`⏳ ${loadingMessage}`, { duration: 0 });
    }
    
    const result = await asyncFn();
    
    if (loadingToastId) {
      toast.dismiss(loadingToastId);
    }
    
    if (successMessage) {
      showSuccess(successMessage);
    }
    
    return result;
    
  } catch (error) {
    if (loadingToastId) {
      toast.dismiss(loadingToastId);
    }
    
    if (errorMessage) {
      showError({ message: errorMessage });
    } else {
      showError(error);
    }
    
    if (rethrow) {
      throw error;
    }
    
    return null;
  }
}

/**
 * Create a retry wrapper for flaky operations
 * @param {Function} asyncFn - Async function to retry
 * @param {object} options - Retry options
 * @returns {Promise<any>} - Result
 */
export async function withRetry(asyncFn, options = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null,
    retryCondition = () => true
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      
      if (onRetry) {
        onRetry(attempt, maxRetries, error);
      } else {
        console.log(`🔄 Retry ${attempt}/${maxRetries} in ${waitTime}ms...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

/**
 * Check if error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
export function isRetryableError(error) {
  if (!error) return false;
  
  const retryableCodes = [
    'unavailable',
    'resource-exhausted',
    'aborted',
    'network/timeout',
    'network/offline'
  ];
  
  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }
  
  if (error.message) {
    const retryablePatterns = ['timeout', 'network', 'Target ID', 'unavailable'];
    return retryablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  return false;
}

/**
 * Format error for logging
 * @param {Error} error - Error to format
 * @returns {object} - Formatted error info
 */
export function formatErrorForLog(error) {
  return {
    message: error?.message || 'Unknown error',
    code: error?.code || 'unknown',
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    online: navigator.onLine
  };
}

// Export error messages for external use/customization
export { ERROR_MESSAGES, ERROR_CATEGORIES };

console.log('⚠️ Error messages utility loaded');