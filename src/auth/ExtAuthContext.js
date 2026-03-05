import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { BACKEND_URL } from '../lib/config'

const ExtAuthContext = createContext(null)

export function ExtAuthProvider({ children }) {
  const [extUser, setExtUser] = useState(() => {
    const raw = localStorage.getItem('discovery_ext_ui_user')
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    if (extUser) localStorage.setItem('discovery_ext_ui_user', JSON.stringify(extUser))
    else localStorage.removeItem('discovery_ext_ui_user')
  }, [extUser])

  async function login(username, password) {
    const baseUrl = BACKEND_URL
    const res = await fetch(`${baseUrl}/api/ext-auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    if (!res.ok) throw new Error('Login failed')
    const data = await res.json()
    const next = {
      id: data.user.id,
      username: data.user.username,
      trackerUserId: data.user.trackerUserId,
      token: data.token
    }
    setExtUser(next)
    return next
  }

  function logout() {
    setExtUser(null)
    try {
      localStorage.removeItem('discovery_ext_ui_user')
    } catch (e) {
      // ignore storage errors
    }
  }

  const value = useMemo(() => ({ extUser, login, logout }), [extUser])

  return <ExtAuthContext.Provider value={value}>{children}</ExtAuthContext.Provider>
}

export function useExtAuth() {
  const ctx = useContext(ExtAuthContext)
  if (!ctx) throw new Error('useExtAuth must be used within ExtAuthProvider')
  return ctx
}



