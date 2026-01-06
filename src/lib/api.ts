/**
 * API utilities for handling native vs web API calls.
 *
 * In native Capacitor apps, API calls need to go to the production server
 * since there's no local server running. On web, we use relative URLs.
 */

// Production API URL - update this to your deployed Vercel URL
const PRODUCTION_API_URL = "https://knuckletrainer.com";

/**
 * Detects if the app is running in a native Capacitor environment.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  // Capacitor injects this global when running in a native app
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    ?.isNativePlatform?.();
}

/**
 * Returns the base URL for API calls.
 * - In native apps: returns the production URL
 * - On web: returns empty string (relative URLs work)
 */
export function getApiBaseUrl(): string {
  if (isNativeApp()) {
    return PRODUCTION_API_URL;
  }
  return "";
}
