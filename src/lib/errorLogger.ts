/**
 * Sanitized error logging utility
 * Prevents sensitive information exposure in production logs
 */

type ErrorLevel = 'debug' | 'info' | 'warn' | 'error';

interface SanitizedError {
  message: string;
  code?: string;
  timestamp: string;
  level: ErrorLevel;
}

/**
 * Sanitizes error objects to remove sensitive information
 * Only logs safe, generic error details
 */
export const sanitizeError = (error: any): SanitizedError => {
  const timestamp = new Date().toISOString();
  
  // Extract only safe error properties
  const sanitized: SanitizedError = {
    message: 'An error occurred',
    timestamp,
    level: 'error'
  };

  // Add error code if available (safe to log)
  if (error?.code) {
    sanitized.code = String(error.code);
  }

  // Map common error codes to user-friendly messages
  if (error?.code === 'PGRST301') {
    sanitized.message = 'Permission denied';
  } else if (error?.code === '23505') {
    sanitized.message = 'Duplicate entry';
  } else if (error?.code === '23503') {
    sanitized.message = 'Related record not found';
  } else if (error?.message && typeof error.message === 'string') {
    // Only include generic error message, not full details
    sanitized.message = error.message.substring(0, 100);
  }

  return sanitized;
};

/**
 * Logs errors with appropriate sanitization based on environment
 * In production: Only logs sanitized errors
 * In development: Logs full error details
 */
export const logError = (error: any, context?: string, level: ErrorLevel = 'error') => {
  const isDevelopment = import.meta.env.DEV;
  
  if (isDevelopment) {
    // Full logging in development
    const logMethod = console[level] || console.error;
    if (context) {
      logMethod(`[${context}]`, error);
    } else {
      logMethod(error);
    }
  } else {
    // Sanitized logging in production
    const sanitized = sanitizeError(error);
    const logMethod = console[level] || console.error;
    
    if (context) {
      logMethod(`[${context}]`, sanitized);
    } else {
      logMethod(sanitized);
    }
  }
};

/**
 * Gets a user-friendly error message for display
 * Never exposes sensitive internal details
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  const sanitized = sanitizeError(error);
  
  // Map to user-friendly messages
  const errorMessages: Record<string, string> = {
    'PGRST301': 'You do not have permission to perform this action.',
    '23505': 'This item already exists.',
    '23503': 'Cannot complete operation. Related data is missing.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  };

  return errorMessages[sanitized.code || ''] || 'An unexpected error occurred. Please try again.';
};

/**
 * Safe logging for edge functions
 * Redacts user IDs, emails, and sensitive data
 */
export const logEdgeFunction = (
  functionName: string,
  message: string,
  data?: any,
  level: ErrorLevel = 'info'
) => {
  const isDevelopment = import.meta.env.DEV;
  const timestamp = new Date().toISOString();
  
  const logData = {
    function: functionName,
    message,
    timestamp,
    level,
  };

  if (isDevelopment && data) {
    // Include data in development
    console[level](`[${functionName}]`, message, data);
  } else {
    // Exclude sensitive data in production
    console[level](`[${functionName}]`, logData);
  }
};
