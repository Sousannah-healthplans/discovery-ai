import DashboardLayout from '../../layouts/DashboardLayout';
import MetricCard from '../../components/MetricCard';
import { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  Users, 
  Activity, 
  Clock, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { adminFetchOverview, adminFetchUsers, adminFetchUserSessions } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';

export default function AdminHome() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ 
    totalUsers: 0, 
    totalEvents: 0, 
    totalSessions: 0, 
    avgEventsPerUser: 0
  });
  const [loading, setLoading] = useState(true);

  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  useEffect(() => {
    if (!baseUrl || !token) return;
    
    setLoading(true);
    
    Promise.all([
      adminFetchUsers(baseUrl, token),
      adminFetchOverview(baseUrl, token)
    ])
      .then(async ([usersData, overviewData]) => {
        const usersList = Array.isArray(usersData) ? usersData : [];
        setUsers(usersList);
        
        let totalUsers = overviewData?.totalUsers ?? usersList.length ?? 0;
        let totalEvents = overviewData?.totalEvents ?? usersList.reduce((sum, u) => sum + (u.events || 0), 0);
        let totalSessions = overviewData?.totalSessions ?? 0;
      
        // Fallback: if sessions missing, derive from per-user sessions
        if (!totalSessions && usersList.length > 0) {
          try {
            const perUserSessions = await Promise.all(
              usersList.map(u => adminFetchUserSessions(baseUrl, u.userId, token, 200).catch(() => []))
            );
            const derivedTotalSessions = perUserSessions.flat().length;
            if (derivedTotalSessions > 0) {
              totalSessions = derivedTotalSessions;
            }
          } catch (e) {
            // ignore fallback errors
          }
        }

        const avgEventsPerUser = totalUsers > 0 ? Math.round(totalEvents / totalUsers) : 0;
        
        setStats({
          totalUsers,
          totalEvents,
          totalSessions,
          avgEventsPerUser
        });
        setLoading(false);
      })
      .catch(() => {
      setLoading(false);
    });
  }, [baseUrl, token]);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout variant="admin">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading admin dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6 overflow-x-hidden min-w-0">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Admin Dashboard</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Overview of all extension users and their activity
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6 min-w-0">
        <MetricCard 
          label="Total Extension Users" 
          value={stats.totalUsers} 
          icon={Users}
        />
        <MetricCard 
          label="Total Events" 
          value={stats.totalEvents} 
          icon={Activity}
        />
        <MetricCard 
          label="Total Sessions" 
          value={stats.totalSessions} 
          icon={Calendar}
        />
        <MetricCard 
          label="Avg Events/User" 
          value={stats.avgEventsPerUser} 
          icon={TrendingUp}
        />
      </div>

      {/* Users Overview */}
      <div className="mb-6 min-w-0 overflow-x-hidden">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users size={20} />
          Extension Users ({users.length})
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.slice(0, 3).map((user, idx) => (
            <div key={user.userId || idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1">
                    {user.username || `User ${user.userId?.slice(0, 12)}`}
                  </h4>
                  {user.email && (
                    <div className="text-sm text-slate-400 dark:text-slate-500 mb-1">
                      {user.email}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 dark:text-slate-500 mb-2">
                    First seen: {formatDate(user.firstTs)}
                  </div>
                </div>
                </div>

              {/* User Analytics */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-blue-400" />
                        <span className="text-slate-600 dark:text-slate-400">Events:</span>
                    <span className="font-medium">{user.events || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-purple-400" />
                    <span className="text-slate-600 dark:text-slate-400">Last:</span>
                    <span className="font-medium text-xs">{formatDate(user.lastTs)}</span>
                      </div>
                      </div>
                    </div>
                    
              {/* User ID */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1">
                  <div>User ID: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{user.userId?.substring(0, 12)}...</code></div>
                  {user.username && (
                    <div>Username: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{user.username}</code></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Summary */}
      {users.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2 min-w-0">
          {/* Users by Activity */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Users by Activity
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={users.slice(0, 10).map(user => ({
                  name: user.userId?.slice(0, 8) || 'Unknown',
                  events: user.events || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9ca3af"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Bar dataKey="events" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Recently Active Users
            </h3>
            <div className="space-y-3">
              {users
                .sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0))
                .slice(0, 5)
                .map((user, idx) => (
                <div key={user.userId || idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">User {user.userId?.slice(0, 12) || 'Unknown'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{user.events || 0} events</div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(user.lastTs)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
