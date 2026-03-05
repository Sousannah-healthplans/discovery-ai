import { useState } from 'react';
import { motion } from 'framer-motion';
import SiteLayout from '../layouts/SiteLayout';
import { useAuth } from '../auth/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/redirect" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Support both email (regular users) and username (extension users)
    await login(email || 'client@discovery.ai', password || 'client-discovery');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
    setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <div className="relative min-h-[70vh] grid place-items-center px-4">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-0 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/25 to-cyan-500/25 blur-3xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        />
        <motion.form initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} onSubmit={onSubmit} className="w-full max-w-md p-8 rounded-3xl bg-white/70 border border-slate-200 text-slate-800 shadow-xl backdrop-blur dark:bg-white/5 dark:border-white/10 dark:text-white">
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="text-sm text-slate-600 dark:text-cyan-200 mt-1">Quick demo logins are available below.</p>
          <div className="mt-6 grid gap-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
            <label className="grid gap-2">
              <span className="text-sm text-slate-700 dark:text-cyan-200">Email or Username</span>
              <input className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-black/40 dark:border-white/10 dark:text-white" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com or username" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-slate-700 dark:text-cyan-200">Password</span>
              <input type="password" className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-black/40 dark:border-white/10 dark:text-white" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
            </label>
            <motion.button whileHover={{ y: -2 }} whileTap={{ y: 0 }} disabled={loading} className="mt-2 rounded-2xl px-4 py-2 bg-gradient-to-r from-cyan-600 to-orange-500 text-white font-semibold disabled:opacity-70">
              {loading? 'Signing in...' : 'Sign in'}
            </motion.button>
          <div className="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    await login('admin@discovery.ai', 'admin-discovery');
                  } catch (err) {
                    setError(err.message || 'Login failed. Please check your credentials.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200/70 transition dark:bg-white/10 dark:text-white dark:border-white/10 disabled:opacity-70"
              >
                Login Admin
              </button>
              <button 
                type="button" 
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    await login('pm@discovery.ai', 'pm-discovery');
                  } catch (err) {
                    setError(err.message || 'Login failed. Please check your credentials.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200/70 transition dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50 disabled:opacity-70"
              >
                Login PM
              </button>
            </div>
          </div>
        </motion.form>
      </div>
    </SiteLayout>
  );
}


