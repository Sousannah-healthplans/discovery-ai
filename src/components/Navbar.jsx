import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, UserCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import CTAButton from './CTAButton';

export default function Navbar() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return false;
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b border-slate-200 text-slate-900 bg-white/60 dark:text-white dark:border-white/10 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="font-extrabold tracking-tight text-xl">
          <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-cyan-500 bg-clip-text text-transparent">Discovery AI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/" className={({isActive})=>`relative pb-1 ${isActive? 'text-orange-600 dark:text-orange-300':'text-slate-600 hover:text-slate-900 dark:text-cyan-200 dark:hover:text-white'}`}>
            Home
            <span className="absolute left-0 bottom-0 h-[2px] w-full scale-x-0 origin-left bg-gradient-to-r from-orange-500 to-cyan-500 transition-transform duration-300 group-[.active]:scale-x-100" />
          </NavLink>
          <NavLink to="/schedule-demo" className={({isActive})=>`relative pb-1 ${isActive? 'text-orange-600 dark:text-orange-300':'text-slate-600 hover:text-slate-900 dark:text-cyan-200 dark:hover:text-white'}`}>
            Schedule Demo
            <span className="absolute left-0 bottom-0 h-[2px] w-full scale-x-0 origin-left bg-gradient-to-r from-orange-500 to-cyan-500 transition-transform duration-300 group-[.active]:scale-x-100" />
          </NavLink>
          {user ? (
            <div className="flex items-center gap-4">
              <NavLink
                to="/redirect"
                className={({isActive})=>`inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-cyan-200 dark:hover:text-white ${isActive ? 'font-semibold' : ''}`}
                title="Go to your dashboard"
              >
                <UserCircle2 size={18} /> Profile
              </NavLink>
            <button onClick={()=>{logout(); navigate('/');}} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-cyan-200 dark:hover:text-white">
              <LogOut size={16} /> Logout
            </button>
            </div>
          ) : (
            <NavLink to="/login" className={({isActive})=>`relative pb-1 ${isActive? 'text-orange-600 dark:text-orange-300':'text-slate-600 hover:text-slate-900 dark:text-cyan-200 dark:hover:text-white'}`}>
              Login
              <span className="absolute left-0 bottom-0 h-[2px] w-full scale-x-0 origin-left bg-gradient-to-r from-orange-500 to-cyan-500 transition-transform duration-300 group-[.active]:scale-x-100" />
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <button aria-label="Toggle theme" onClick={()=>setDark(d=>!d)} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 dark:bg-white/10 dark:border-white/10 dark:text-white">
            {dark ? <Sun size={18}/> : <Moon size={18}/>} 
          </button>
          <CTAButton className="hidden sm:inline-flex"><Link to="/schedule-demo">Book Demo</Link></CTAButton>
        </div>
      </div>
    </header>
  );
}


