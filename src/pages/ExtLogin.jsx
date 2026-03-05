import { useState } from 'react'
import { motion } from 'framer-motion'
import SiteLayout from '../layouts/SiteLayout'
import { useExtAuth } from '../auth/ExtAuthContext'
import { Navigate } from 'react-router-dom'

export default function ExtLogin() {
  const { extUser, login } = useExtAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (extUser) return <Navigate to="/ext-dashboard" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
    } catch (e) {
      setError('Login failed, check your name and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SiteLayout>
      <div className="relative min-h-[70vh] grid place-items-center px-4">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={onSubmit}
          className="w-full max-w-md p-8 rounded-3xl bg-white/70 border border-slate-200 text-slate-800 shadow-xl backdrop-blur dark:bg-white/5 dark:border-white/10 dark:text-white"
        >
          <h2 className="text-2xl font-bold">Extension user login</h2>
          <p className="text-sm text-slate-600 dark:text-cyan-200 mt-1">
            Sign in with the name and password you created when installing the Discovery AI extension.
          </p>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm text-slate-700 dark:text-cyan-200">Name</span>
              <input
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-black/40 dark:border-white/10 dark:text-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-slate-700 dark:text-cyan-200">Password</span>
              <input
                type="password"
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-black/40 dark:border-white/10 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              disabled={loading}
              className="mt-2 rounded-2xl px-4 py-2 bg-gradient-to-r from-cyan-600 to-orange-500 text-white font-semibold disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </motion.button>
          </div>
        </motion.form>
      </div>
    </SiteLayout>
  )
}



