import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Settings, Users, ChartPie, BarChart3, Images, List, UserCheck, FolderOpen, UserPlus, Camera, UsersRound, Radio, FileText } from 'lucide-react';
import { extFetchInvitations } from '../lib/api';
import { BACKEND_URL } from '../lib/config';

export default function Sidebar({ variant = 'client' }) {
  const [pendingInvites, setPendingInvites] = useState(0);
  
  // Fetch pending invitations for client sidebar
  useEffect(() => {
    if (variant === 'client') {
      const token = localStorage.getItem('authToken');
      if (token) {
        extFetchInvitations(BACKEND_URL, token)
          .then(data => {
            const pending = Array.isArray(data) ? data.filter(inv => inv.status === 'pending').length : 0;
            setPendingInvites(pending);
          })
          .catch(() => setPendingInvites(0));
      }
    }
  }, [variant]);

  const links = variant === 'admin'
    ? [
        { to: '/admin', label: 'Overview', icon: LayoutDashboard },
        { to: '/admin/clients', label: 'Clients', icon: Users },
        { to: '/admin/users', label: 'Users', icon: UserCheck },
        { to: '/admin/claims', label: 'Claims', icon: FileText },
        { to: '/admin/analytics', label: 'Analytics', icon: ChartPie },
        { to: '/admin/users-analytics', label: 'Users Analytics', icon: BarChart3 },
      ]
    : variant === 'pm'
    ? [
        { to: '/pm', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/pm/team', label: 'Team Members', icon: UserPlus },
        { to: '/pm/users', label: 'Users', icon: Users },
        { to: '/pm/sessions', label: 'Sessions', icon: List },
        { to: '/pm/screenshots', label: 'Screenshots', icon: Camera },
        { to: '/pm/claims', label: 'Claims', icon: FolderOpen },
        { to: '/pm/remote-sessions', label: 'Remote Sessions', icon: Radio },
        { to: '/pm/analytics', label: 'Analytics', icon: ChartPie },
      ]
    : [
        { to: '/client', label: 'Overview', icon: LayoutDashboard },
        { to: '/client/sessions', label: 'Sessions', icon: List },
        { to: '/client/tabs', label: 'Tabs', icon: FolderOpen },
        { to: '/client/screenshots', label: 'Screens', icon: Images },
        { to: '/client/analytics', label: 'Analytics', icon: ChartPie },
        { to: '/client/team', label: 'My Team', icon: UsersRound, badge: pendingInvites },
        { to: '/client/settings', label: 'Settings', icon: Settings },
      ];

  return (
    <aside className="w-64 shrink-0 h-full border-r border-slate-200 bg-white text-slate-700 hidden md:block dark:border-white/10 dark:bg-slate-950/50 dark:text-cyan-200 md:sticky md:top-6 self-start">
      <nav className="p-4 space-y-1">
        {links.map(({to, label, icon: Icon, badge})=> (
          <NavLink key={to} to={to} className={({isActive})=>
            (isActive?'bg-slate-100 text-slate-900 dark:bg-cyan-500/20 dark:text-white':'hover:bg-slate-50 dark:hover:bg-white/5')+ ' flex items-center gap-2 px-3 py-2 rounded-xl'}>
            <Icon size={18} /> 
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded-full animate-pulse">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}


