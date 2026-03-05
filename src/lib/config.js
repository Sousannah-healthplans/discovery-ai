/**
 * Centralized configuration for the application
 * Backend URL is determined by environment variable or falls back to Railway production URL
 */

// Helper to normalize URLs and fix double slashes
function normalizeUrl(url) {
  if (!url) return url;
  // Ensure protocol is present (default to https if missing)
  if (!url.match(/^https?:\/\//)) {
    url = `https://${url}`;
  }
  // Remove trailing slash
  url = url.replace(/\/+$/, '');
  // Fix double slashes (but keep ://)
  url = url.replace(/([^:]\/)\/+/g, '$1');
  return url;
}

// Get backend URL from environment variable
// For local development, create a .env file with: REACT_APP_DISCOVERY_BACKEND=http://localhost:5000
// For production (Railway), set REACT_APP_DISCOVERY_BACKEND in Railway environment variables
const rawBackendUrl = process.env.REACT_APP_DISCOVERY_BACKEND || 'https://web-production-c309a.up.railway.app';
export const BACKEND_URL = normalizeUrl(rawBackendUrl);

// Log the backend URL in development for debugging (remove in production if needed)
if (process.env.NODE_ENV === 'development') {
  console.log('[Config] Backend URL:', BACKEND_URL);
}

// Helper to get backend URL (for consistency)
export function getBackendUrl() {
  return BACKEND_URL;
}

