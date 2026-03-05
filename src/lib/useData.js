/**
 * React hooks for optimized data fetching with caching
 * Provides SWR-like pattern with stale-while-revalidate
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchOverview, fetchEvents, fetchSessions, fetchScreenshots, fetchTabs } from './api';
import { 
  getCacheKey, 
  getCached, 
  smartFetch, 
  clearCache, 
  subscribe,
  preload 
} from './dataCache';
import { BACKEND_URL } from './config';

// Get auth info from localStorage
function getAuthInfo() {
  const baseUrl = BACKEND_URL;
  const projectId = localStorage.getItem('projectId') || 'discovery-ai';
  const token = localStorage.getItem('authToken') || '';
  return { baseUrl, projectId, token };
}

/**
 * Generic data hook with caching
 */
export function useDataFetch(keyPrefix, fetchFn, deps = [], options = {}) {
  const { initialData = null, enabled = true } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  
  // Generate cache key from prefix and dependencies
  const cacheKey = useMemo(() => {
    return getCacheKey(keyPrefix, deps.reduce((acc, dep, i) => {
      acc[`dep${i}`] = String(dep);
      return acc;
    }, {}));
  }, [keyPrefix, deps]);
  
  const refresh = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await smartFetch(
        cacheKey,
        fetchFn,
        {
          forceRefresh,
          onBackground: (newData) => {
            if (mountedRef.current) {
              setData(newData);
            }
          }
        }
      );
      
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
      
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
      throw err;
    }
  }, [cacheKey, fetchFn, enabled]);
  
  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      // Check cache first for immediate data
      const cached = getCached(cacheKey);
      if (cached && !cached.isExpired) {
        setData(cached.data);
        setLoading(cached.isStale); // Only show loading if stale
      }
      
      refresh();
    }
    
    // Subscribe to cache updates
    const unsubscribe = subscribe(cacheKey, (newData) => {
      if (mountedRef.current) {
        setData(newData);
      }
    });
    
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [cacheKey, enabled, refresh]);
  
  return { data, loading, error, refresh };
}

/**
 * Hook for fetching overview data
 */
export function useOverview(options = {}) {
  const { baseUrl, projectId, token } = getAuthInfo();
  const enabled = !!(baseUrl && projectId && token);
  
  return useDataFetch(
    'overview',
    () => fetchOverview(baseUrl, projectId, token),
    [baseUrl, projectId, token],
    { ...options, enabled: enabled && options.enabled !== false }
  );
}

/**
 * Hook for fetching sessions data
 */
export function useSessions(limit = 100, options = {}) {
  const { baseUrl, projectId, token } = getAuthInfo();
  const enabled = !!(baseUrl && projectId && token);
  
  return useDataFetch(
    `sessions_${limit}`,
    () => fetchSessions(baseUrl, projectId, token, limit),
    [baseUrl, projectId, token, limit],
    { ...options, enabled: enabled && options.enabled !== false, initialData: [] }
  );
}

/**
 * Hook for fetching events data
 */
export function useEvents(type = undefined, limit = 200, options = {}) {
  const { baseUrl, projectId, token } = getAuthInfo();
  const enabled = !!(baseUrl && projectId && token);
  
  return useDataFetch(
    `events_${type || 'all'}_${limit}`,
    () => fetchEvents(baseUrl, projectId, token, type, limit),
    [baseUrl, projectId, token, type, limit],
    { ...options, enabled: enabled && options.enabled !== false, initialData: [] }
  );
}

/**
 * Hook for fetching screenshots data
 */
export function useScreenshots(limit = 100, options = {}) {
  const { baseUrl, projectId, token } = getAuthInfo();
  const enabled = !!(baseUrl && projectId && token);
  
  return useDataFetch(
    `screenshots_${limit}`,
    () => fetchScreenshots(baseUrl, projectId, token, limit),
    [baseUrl, projectId, token, limit],
    { ...options, enabled: enabled && options.enabled !== false, initialData: [] }
  );
}

/**
 * Hook for fetching aggregated tabs data from all sessions
 */
export function useTabs(options = {}) {
  const { baseUrl, projectId, token } = getAuthInfo();
  const enabled = !!(baseUrl && projectId && token);
  
  return useDataFetch(
    'tabs',
    () => fetchTabs(baseUrl, projectId, token),
    [baseUrl, projectId, token],
    { ...options, enabled: enabled && options.enabled !== false, initialData: [] }
  );
}

/**
 * Combined hook for dashboard data (overview + recent sessions)
 * Fetches minimal data in parallel with caching - optimized for fast initial load
 */
export function useDashboardData(options = {}) {
  const { baseUrl, projectId, token } = getAuthInfo();
  const enabled = !!(baseUrl && projectId && token);
  
  const [data, setData] = useState({
    overview: null,
    sessions: [],
    events: [],
    screenshots: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  
  const cacheKeys = useMemo(() => ({
    overview: getCacheKey('overview', { baseUrl, projectId }),
    sessions: getCacheKey('sessions_10', { baseUrl, projectId })
  }), [baseUrl, projectId]);
  
  const refresh = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch only essential data in parallel - overview already has event type breakdown
      const [overview, sessions] = await Promise.all([
        smartFetch(cacheKeys.overview, () => fetchOverview(baseUrl, projectId, token), { forceRefresh }),
        smartFetch(cacheKeys.sessions, () => fetchSessions(baseUrl, projectId, token, 10), { forceRefresh })
      ]);
      
      if (mountedRef.current) {
        setData({ overview, sessions, events: [], screenshots: [] });
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [enabled, baseUrl, projectId, token, cacheKeys]);
  
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      // Check all caches for immediate data
      const cachedOverview = getCached(cacheKeys.overview);
      const cachedSessions = getCached(cacheKeys.sessions);
      const cachedEvents = getCached(cacheKeys.events);
      const cachedScreenshots = getCached(cacheKeys.screenshots);
      
      const hasAnyCache = cachedOverview || cachedSessions || cachedEvents || cachedScreenshots;
      
      if (hasAnyCache) {
        setData({
          overview: cachedOverview?.data || null,
          sessions: cachedSessions?.data || [],
          events: cachedEvents?.data || [],
          screenshots: cachedScreenshots?.data || []
        });
        
        // Only show loading if all caches are stale/expired
        const allStale = (!cachedOverview || cachedOverview.isStale) &&
                        (!cachedSessions || cachedSessions.isStale) &&
                        (!cachedEvents || cachedEvents.isStale) &&
                        (!cachedScreenshots || cachedScreenshots.isStale);
        setLoading(allStale);
      }
      
      refresh();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, cacheKeys, refresh]);
  
  return { ...data, loading, error, refresh };
}

/**
 * Combined hook for analytics page data - optimized limits
 */
export function useAnalyticsData(options = {}) {
  const { baseUrl, projectId, token } = getAuthInfo();
  const enabled = !!(baseUrl && projectId && token);
  
  const [data, setData] = useState({
    overview: null,
    sessions: [],
    events: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  
  const cacheKeys = useMemo(() => ({
    overview: getCacheKey('overview', { baseUrl, projectId }),
    sessions: getCacheKey('sessions_100', { baseUrl, projectId }),
    events: getCacheKey('events_all_200', { baseUrl, projectId })
  }), [baseUrl, projectId]);
  
  const refresh = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch with reduced limits for faster loading
      const [overview, sessions, events] = await Promise.all([
        smartFetch(cacheKeys.overview, () => fetchOverview(baseUrl, projectId, token), { forceRefresh }),
        smartFetch(cacheKeys.sessions, () => fetchSessions(baseUrl, projectId, token, 100), { forceRefresh }),
        smartFetch(cacheKeys.events, () => fetchEvents(baseUrl, projectId, token, undefined, 200), { forceRefresh })
      ]);
      
      if (mountedRef.current) {
        setData({ overview, sessions, events });
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [enabled, baseUrl, projectId, token, cacheKeys]);
  
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      const cachedOverview = getCached(cacheKeys.overview);
      const cachedSessions = getCached(cacheKeys.sessions);
      const cachedEvents = getCached(cacheKeys.events);
      
      const hasAnyCache = cachedOverview || cachedSessions || cachedEvents;
      
      if (hasAnyCache) {
        setData({
          overview: cachedOverview?.data || null,
          sessions: cachedSessions?.data || [],
          events: cachedEvents?.data || []
        });
        
        const allStale = (!cachedOverview || cachedOverview.isStale) &&
                        (!cachedSessions || cachedSessions.isStale) &&
                        (!cachedEvents || cachedEvents.isStale);
        setLoading(allStale);
      }
      
      refresh();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, cacheKeys, refresh]);
  
  return { ...data, loading, error, refresh };
}

/**
 * Hook for session detail page - uses server-side filtering for speed
 */
export function useSessionDetail(sessionId, options = {}) {
  const { baseUrl, projectId, token } = getAuthInfo();
  const enabled = !!(baseUrl && projectId && token && sessionId);
  
  const [data, setData] = useState({
    events: [],
    screenshots: [],
    session: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  
  const cacheKeys = useMemo(() => ({
    events: getCacheKey(`session_events_${sessionId}`, { baseUrl, projectId, sessionId }),
    screenshots: getCacheKey(`session_screenshots_${sessionId}`, { baseUrl, projectId, sessionId }),
    sessions: getCacheKey('sessions_100', { baseUrl, projectId })
  }), [sessionId, baseUrl, projectId]);
  
  const refresh = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Use server-side sessionId filtering - much faster!
      const [events, screenshots, sessions] = await Promise.all([
        smartFetch(cacheKeys.events, () => fetchEvents(baseUrl, projectId, token, undefined, 500, null, sessionId), { forceRefresh }),
        smartFetch(cacheKeys.screenshots, () => fetchScreenshots(baseUrl, projectId, token, 50, null, sessionId), { forceRefresh }),
        smartFetch(cacheKeys.sessions, () => fetchSessions(baseUrl, projectId, token, 100), { forceRefresh })
      ]);
      
      // Session is already filtered server-side, just find the matching one
      const session = sessions.find(s => s.sessionId === sessionId);
      
      if (mountedRef.current) {
        setData({ events: events || [], screenshots: screenshots || [], session });
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [enabled, sessionId, baseUrl, projectId, token, cacheKeys]);
  
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      refresh();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, sessionId, refresh]);
  
  return { ...data, loading, error, refresh };
}

/**
 * Preload data for common pages
 */
export function preloadDashboardData() {
  const { baseUrl, projectId, token } = getAuthInfo();
  if (!baseUrl || !projectId || !token) return;
  
  preload([
    { key: getCacheKey('overview', { baseUrl, projectId }), fetchFn: () => fetchOverview(baseUrl, projectId, token) },
    { key: getCacheKey('sessions_100', { baseUrl, projectId }), fetchFn: () => fetchSessions(baseUrl, projectId, token, 100) },
    { key: getCacheKey('events_all_500', { baseUrl, projectId }), fetchFn: () => fetchEvents(baseUrl, projectId, token, undefined, 500) },
    { key: getCacheKey('screenshots_100', { baseUrl, projectId }), fetchFn: () => fetchScreenshots(baseUrl, projectId, token, 100) }
  ]);
}

/**
 * Clear all data cache (useful on logout)
 */
export function clearDataCache() {
  clearCache();
}

