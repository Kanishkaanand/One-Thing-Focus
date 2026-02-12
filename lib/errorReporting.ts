/**
 * Error Reporting Utility
 *
 * A production-ready error logging system that:
 * - Captures errors with context and severity
 * - Persists critical errors to AsyncStorage
 * - Can be extended to integrate with Sentry, Bugsnag, etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorLogEntry {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context?: ErrorContext;
}

// Storage key for persisted errors
const ERROR_LOG_KEY = '@onething_error_log';

// In-memory log buffer
const errorLog: ErrorLogEntry[] = [];
const MAX_LOG_SIZE = 100;
const MAX_PERSISTED_ERRORS = 50;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Generate simple ID for error entries
function generateErrorId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Log an error with context
 */
export function logError(
  error: Error | string,
  severity: ErrorSeverity = 'error',
  context?: ErrorContext
): void {
  const entry: ErrorLogEntry = {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    severity,
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    context,
  };

  // Add to log buffer
  errorLog.push(entry);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.shift();
  }

  // Console output in development
  if (isDev) {
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
        console.error(prefix, entry.message, contextStr, entry.stack || '', context?.metadata || '');
        break;
    }
  }

  // Persist error and fatal severity to storage for later analysis
  if (severity === 'error' || severity === 'fatal') {
    persistError(entry).catch(() => {
      // Silent fail - don't create infinite loop if storage fails
    });
  }

  // In production, this is where you'd send to an external service
  // Example: Sentry.captureException(error, { extra: context });
}

/**
 * Persist error to AsyncStorage for later retrieval
 */
async function persistError(entry: ErrorLogEntry): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(ERROR_LOG_KEY);
    const errors: ErrorLogEntry[] = existing ? JSON.parse(existing) : [];

    errors.push(entry);

    // Keep only the most recent errors
    const trimmed = errors.slice(-MAX_PERSISTED_ERRORS);

    await AsyncStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // Silent fail
  }
}

/**
 * Get persisted errors from storage
 */
export async function getPersistedErrors(): Promise<ErrorLogEntry[]> {
  try {
    const data = await AsyncStorage.getItem(ERROR_LOG_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Clear persisted errors
 */
export async function clearPersistedErrors(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ERROR_LOG_KEY);
  } catch {
    // Silent fail
  }
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
