import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { roles } from '../lib/utils';
import { preloadDashboardData, clearDataCache } from '../lib/useData';
import { BACKEND_URL } from '../lib/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('mvp_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem('mvp_user', JSON.stringify(user));
    else localStorage.removeItem('mvp_user');
  }, [user]);

  async function login(emailOrUsername, password) {
    try {
      const baseUrl = BACKEND_URL
      // Try as email first, then as username (for extension users)
      const isEmail = emailOrUsername && emailOrUsername.includes('@')
      const body = isEmail 
        ? { email: emailOrUsername, password }
        : { username: emailOrUsername, password }
      const res = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[AuthContext] Login failed:', res.status, errorText)
        throw new Error('Login failed')
      }
      const data = await res.json()
      
      // Determine role: use role field from backend if available, fallback to isAdmin check
      let role = data.user?.role
      if (!role) {
        const isAdmin = data.user && (
          data.user.isAdmin === true || 
          data.user.isAdmin === 'true' || 
          data.user.isAdmin === 1 ||
          String(data.user.isAdmin).toLowerCase() === 'true'
        )
        role = isAdmin ? roles.ADMIN : roles.CLIENT
      }
      
      console.log('[AuthContext] Login response:', { 
        email: data.user?.email, 
        role: data.user?.role,
        projectId: data.user?.projectId,
        isAdmin: data.user?.isAdmin,
        finalRole: role,
        userData: data.user 
      })
      
      const nextUser = { 
        id: data.user.id, 
        email: data.user.email, 
        role, 
        name: data.user.name || data.user.username, 
        token: data.token,
        isExtension: data.user.isExtension || false,
        trackerUserId: data.user.trackerUserId,
        projectId: data.user.projectId || null
      }
      localStorage.setItem('authToken', data.token)
      // Auto select a project for clients
      if (role === roles.CLIENT) {
        try {
          const sitesRes = await fetch(`${baseUrl}/api/sites`, { headers: { Authorization: `Bearer ${data.token}` } })
          if (sitesRes.ok) {
            const sites = await sitesRes.json()
            const mine = sites[0]
            if (mine && mine.projectId) {
              localStorage.setItem('projectId', mine.projectId)
            } else {
              // Default to discovery-ai if no project found
              localStorage.setItem('projectId', 'discovery-ai')
            }
          } else {
            // Default to discovery-ai if request fails
            localStorage.setItem('projectId', 'discovery-ai')
          }
        } catch {
          // Default to discovery-ai on error
          localStorage.setItem('projectId', 'discovery-ai')
        }
      }
      setUser(nextUser)
      
      // Preload dashboard data after successful login for faster initial page load
      setTimeout(() => {
        preloadDashboardData();
      }, 100);
      
      return nextUser
    } catch (e) {
      // Clear any invalid tokens from localStorage
      localStorage.removeItem('authToken')
      localStorage.removeItem('mvp_user')
      localStorage.removeItem('projectId')
      
      // Re-throw the error so the UI can show a proper error message
      console.error('Login failed:', e)
      throw new Error('Login failed. Please check your credentials and try again.')
    }
  }

  function logout() {
    // Clear all auth-related data and cache
    setUser(null);
    clearDataCache(); // Clear cached API data
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('mvp_user');
      localStorage.removeItem('projectId');
    } catch (e) {
      // ignore storage errors
    }
  }

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function RequireAuth({ children, allowed }) {
  const { user } = useAuth();
  if (!user) return null;
  if (allowed && !allowed.includes(user.role)) return null;
  return children;
}


