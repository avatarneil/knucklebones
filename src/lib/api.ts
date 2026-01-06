/**
 * API utilities for handling native vs web API calls.
 *
 * In native Capacitor apps, API calls need to go to the production server
 * since there's no local server running. On web, we use relative URLs.
 *
 * Note: When running in native mode, all API calls will be cross-origin requests.
 * Ensure the backend API has appropriate CORS configuration to accept requests
 * from Capacitor apps (capacitor://localhost for iOS, http://localhost for Android).
 */

import { Capacitor } from "@capacitor/core";

// Production API URL - configurable via NEXT_PUBLIC_API_URL, defaults to deployed Vercel URL
const DEFAULT_PRODUCTION_API_URL = "https://knuckletrainer.com";
const PRODUCTION_API_URL =
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_PRODUCTION_API_URL;

/**
 * Detects if the app is running in a native Capacitor environment.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return Capacitor.isNativePlatform();
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
