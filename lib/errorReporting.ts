/**
 * Error Reporting Utility
 *
 * A lightweight error logging system that can be extended to integrate
 * with external services like Sentry, Bugsnag, etc.
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorLogEntry {
  timestamp: string;
  severity: ErrorSeverity;
  message: string;
  error?: Error;
  context?: ErrorContext;
}

// In-memory log buffer (in production, this could be persisted or sent to a service)
const errorLog: ErrorLogEntry[] = [];
const MAX_LOG_SIZE = 100;

/**
 * Log an error with context
 */
export function logError(
  error: Error | string,
  severity: ErrorSeverity = 'error',
  context?: ErrorContext
): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    severity,
    message: typeof error === 'string' ? error : error.message,
    error: typeof error === 'string' ? undefined : error,
    context,
  };

  // Add to log buffer
  errorLog.push(entry);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.shift();
  }

  // Console output in development
  if (__DEV__) {
    const prefix = `[${severity.toUpperCase()}]`;
    const contextStr = context ? ` (${context.component || 'unknown'}${context.action ? `:${context.action}` : ''})` : '';

    switch (severity) {
      case 'info':
        console.info(prefix, entry.message, contextStr, context?.metadata || '');
        break;
      case 'warning':
        console.warn(prefix, entry.message, contextStr, context?.metadata || '');
        break;
      case 'error':
      case 'fatal':
        console.error(prefix, entry.message, contextStr, entry.error?.stack || '', context?.metadata || '');
        break;
    }
  }

  // In production, this is where you'd send to an external service
  // Example: Sentry.captureException(error, { extra: context });
}

/**
 * Log an informational message
 */
export function logInfo(message: string, context?: ErrorContext): void {
  logError(message, 'info', context);
}

/**
 * Log a warning
 */
export function logWarning(message: string, context?: ErrorContext): void {
  logError(message, 'warning', context);
}

/**
 * Capture an exception with automatic context
 */
export function captureException(
  error: Error,
  context?: ErrorContext
): void {
  logError(error, 'error', context);
}

/**
 * Create a scoped logger for a specific component
 */
export function createLogger(component: string) {
  return {
    info: (message: string, metadata?: Record<string, unknown>) =>
      logInfo(message, { component, metadata }),
    warn: (message: string, metadata?: Record<string, unknown>) =>
      logWarning(message, { component, metadata }),
    error: (error: Error | string, action?: string, metadata?: Record<string, unknown>) =>
      logError(error, 'error', { component, action, metadata }),
  };
}

/**
 * Get recent error logs (useful for debugging)
 */
export function getRecentErrors(count: number = 10): ErrorLogEntry[] {
  return errorLog.slice(-count);
}

/**
 * Clear error logs
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  }) as T;
}
