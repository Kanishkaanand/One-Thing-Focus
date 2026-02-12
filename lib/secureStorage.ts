/**
 * Secure Storage Service
 *
 * Uses expo-secure-store for storing sensitive data that needs
 * encryption at rest. This includes:
 * - User preferences that might contain sensitive info
 * - Future: auth tokens, API keys, etc.
 *
 * Note: expo-secure-store uses:
 * - iOS: Keychain Services
 * - Android: SharedPreferences with encryption
 * - Web: Falls back to localStorage (not encrypted)
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createLogger } from './errorReporting';

const logger = createLogger('SecureStorage');

// Key prefix for app-specific secure storage
const KEY_PREFIX = 'onething_secure_';

// Check if secure storage is available
const isSecureStoreAvailable = Platform.OS !== 'web';

/**
 * Options for secure storage operations
 */
export interface SecureStorageOptions {
  /** Whether to require biometric authentication to access (iOS only) */
  requireAuthentication?: boolean;
}

/**
 * Save a value securely
 * @param key Storage key (will be prefixed)
 * @param value Value to store
 * @param options Optional security options
 */
export async function setSecureItem(
  key: string,
  value: string,
  options?: SecureStorageOptions
): Promise<boolean> {
  const fullKey = KEY_PREFIX + key;

  try {
    if (!isSecureStoreAvailable) {
      // Fallback to localStorage on web (not secure, but functional)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(fullKey, value);
        return true;
      }
      return false;
    }

    await SecureStore.setItemAsync(fullKey, value, {
      requireAuthentication: options?.requireAuthentication ?? false,
    });
    return true;
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'setSecureItem',
      { key }
    );
    return false;
  }
}

/**
 * Retrieve a value from secure storage
 * @param key Storage key (will be prefixed)
 * @returns The stored value or null if not found
 */
export async function getSecureItem(key: string): Promise<string | null> {
  const fullKey = KEY_PREFIX + key;

  try {
    if (!isSecureStoreAvailable) {
      // Fallback to localStorage on web
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(fullKey);
      }
      return null;
    }

    return await SecureStore.getItemAsync(fullKey);
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'getSecureItem',
      { key }
    );
    return null;
  }
}

/**
 * Delete a value from secure storage
 * @param key Storage key (will be prefixed)
 */
export async function deleteSecureItem(key: string): Promise<boolean> {
  const fullKey = KEY_PREFIX + key;

  try {
    if (!isSecureStoreAvailable) {
      // Fallback to localStorage on web
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(fullKey);
        return true;
      }
      return false;
    }

    await SecureStore.deleteItemAsync(fullKey);
    return true;
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'deleteSecureItem',
      { key }
    );
    return false;
  }
}

/**
 * Store a JSON object securely
 * @param key Storage key
 * @param value Object to store
 */
export async function setSecureObject<T>(
  key: string,
  value: T
): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(value);
    return await setSecureItem(key, jsonString);
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'setSecureObject',
      { key }
    );
    return false;
  }
}

/**
 * Retrieve a JSON object from secure storage
 * @param key Storage key
 * @returns The parsed object or null if not found/invalid
 */
export async function getSecureObject<T>(key: string): Promise<T | null> {
  try {
    const jsonString = await getSecureItem(key);
    if (!jsonString) return null;
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'getSecureObject',
      { key }
    );
    return null;
  }
}

/**
 * Check if secure storage is available on this platform
 */
export function isSecureStorageAvailable(): boolean {
  return isSecureStoreAvailable;
}

/**
 * Clear all app secure storage items
 * Note: This only clears items with our key prefix
 */
export async function clearAllSecureItems(): Promise<void> {
  // SecureStore doesn't provide a way to list all keys,
  // so we need to manually track and clear known keys
  const knownKeys = [
    'user_preferences',
    'sensitive_settings',
    // Add other known keys here as they're added
  ];

  for (const key of knownKeys) {
    await deleteSecureItem(key);
  }
}
