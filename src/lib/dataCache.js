/**
 * Data Cache Layer for Discovery AI
 * Provides caching, request deduplication, and stale-while-revalidate pattern
 */

// Cache storage
const cache = new Map();
const pendingRequests = new Map();
const subscribers = new Map();

// Cache configuration
const CACHE_TTL = 60 * 1000; // 1 minute default TTL
const STALE_TTL = 5 * 60 * 1000; // 5 minutes stale threshold

/**
 * Generate cache key from fetch parameters
 */
export function getCacheKey(endpoint, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${endpoint}${sortedParams ? '?' + sortedParams : ''}`;
}

/**
 * Get cached data if available and not expired
 */
export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  const age = now - entry.timestamp;
  
  return {
    data: entry.data,
    isStale: age > CACHE_TTL,
    isExpired: age > STALE_TTL,
    age
  };
}

/**
 * Set cache data
 */
export function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Notify subscribers
  const subs = subscribers.get(key);
  if (subs) {
    subs.forEach(callback => callback(data));
  }
}

/**
 * Subscribe to cache updates for a key
 */
export function subscribe(key, callback) {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key).add(callback);
  
  return () => {
    const subs = subscribers.get(key);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(key);
      }
    }
  };
}

/**
 * Clear specific cache entry or all cache
 */
export function clearCache(key = null) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Deduplicated fetch - prevents multiple identical requests
 */
export async function deduplicatedFetch(key, fetchFn) {
  // Check if request is already in flight
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  // Create the request promise
  const promise = fetchFn()
    .then(data => {
      setCache(key, data);
      pendingRequests.delete(key);
      return data;
    })
    .catch(error => {
      pendingRequests.delete(key);
      throw error;
    });
  
  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Smart fetch with cache - returns cached data immediately if available,
 * then revalidates in background if stale
 */
export async function smartFetch(key, fetchFn, options = {}) {
  const { forceRefresh = false, onBackground = null } = options;
  const cached = getCached(key);
  
  // If we have fresh cache, return it
  if (cached && !cached.isStale && !forceRefresh) {
    return cached.data;
  }
  
  // If we have stale cache, return it but revalidate in background
  if (cached && cached.isStale && !cached.isExpired && !forceRefresh) {
    // Background revalidation
    deduplicatedFetch(key, fetchFn)
      .then(data => {
        if (onBackground) onBackground(data);
      })
      .catch(console.error);
    
    return cached.data;
  }
  
  // No cache or expired - fetch fresh
  return deduplicatedFetch(key, fetchFn);
}

/**
 * Preload multiple cache keys
 */
export function preload(fetchConfigs) {
  return Promise.all(
    fetchConfigs.map(({ key, fetchFn }) => {
      const cached = getCached(key);
      if (!cached || cached.isStale) {
        return deduplicatedFetch(key, fetchFn).catch(() => null);
      }
      return Promise.resolve(cached.data);
    })
  );
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const stats = {
    entries: cache.size,
    pendingRequests: pendingRequests.size,
    subscribers: subscribers.size
  };
  
  const entries = [];
  cache.forEach((value, key) => {
    const age = Date.now() - value.timestamp;
    entries.push({
      key,
      age,
      isStale: age > CACHE_TTL,
      isExpired: age > STALE_TTL
    });
  });
  
  return { ...stats, entries };
}

// Export cache configuration for customization
export const CacheConfig = {
  TTL: CACHE_TTL,
  STALE_TTL
};

