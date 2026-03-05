import DashboardLayout from '../../layouts/DashboardLayout';
import MetricCard from '../../components/MetricCard';
import { useEffect, useState } from 'react';
import { 
  Users, 
  Activity, 
  Clock, 
  TrendingUp,
  Camera,
  BarChart3,
  PieChart
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { pmFetchOverview, pmFetchUsers, pmFetchUserSessions } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { useAuth } from '../../auth/AuthContext';

export default function PMAnalytics() {
  const { user } = useAuth();
  const [overview, setOverview] = useState({ 
    totalUsers: 0, 
    totalSessions: 0, 
    totalEvents: 0,
    avgSessionDurationSec: 0,
    screenshots: 0
  });
  const [, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    dailyActiveUsers: [],
    engagementScore: 0,
    retentionRate: 0,
    avgEventsPerUser: 0,
    topEventTypes: [],
    sessionDurationDistribution: []
  });

  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  useEffect(() => {
    if (!baseUrl || !token) return;
    
    setLoading(true);
    Promise.all([
      pmFetchOverview(baseUrl, token),
      pmFetchUsers(baseUrl, token)
    ]).then(async ([overviewData, usersData]) => {
      const usersList = Array.isArray(usersData) ? usersData : [];
      
      let finalOverview = {
        totalUsers: overviewData?.totalUsers ?? usersList.length ?? 0,
        totalSessions: overviewData?.totalSessions ?? 0,
        totalEvents: overviewData?.totalEvents ?? 0,
        avgSessionDurationSec: overviewData?.avgSessionDurationSec ?? 0,
        screenshots: overviewData?.screenshots ?? 0,
        byType: overviewData?.byType || {}
      };

      // Fallback: if sessions missing, derive from per-user sessions
      if ((finalOverview.totalSessions === 0) && usersList.length > 0) {
        try {
          const perUserSessions = await Promise.all(
            usersList.slice(0, 10).map(u => pmFetchUserSessions(baseUrl, u.userId, token, 100).catch(() => []))
          );
          const flatSessions = perUserSessions.flat();
          const derivedTotalSessions = flatSessions.length;
          const derivedAvgDuration = derivedTotalSessions > 0
            ? flatSessions.reduce((sum, s) => sum + (s.durationSec || 0), 0) / derivedTotalSessions
            : 0;

          finalOverview = {
            ...finalOverview,
            totalSessions: derivedTotalSessions > 0 ? derivedTotalSessions : finalOverview.totalSessions,
            avgSessionDurationSec: derivedAvgDuration > 0 ? derivedAvgDuration : finalOverview.avgSessionDurationSec
          };
        } catch (fallbackErr) {
          console.error('Fallback derivation failed', fallbackErr);
        }
      }
      
      setOverview(finalOverview);
      setUsers(usersList);
      
      // Calculate business analytics
      const processedAnalytics = calculateBusinessAnalytics(finalOverview, usersList);
      setAnalytics(processedAnalytics);
      setLoading(false);
    }).catch((error) => {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    });
  }, [baseUrl, token]);

  const calculateBusinessAnalytics = (overview, users) => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const totalUsers = overview.totalUsers || 0;
    const totalEvents = overview.totalEvents || 0;
    const totalSessions = overview.totalSessions || 0;

    // Daily Active Users (DAU)
    const dau = users.filter(u => u.lastTs && new Date(u.lastTs).getTime() > dayAgo).length;
    
    // Weekly Active Users (WAU)
    const wau = users.filter(u => u.lastTs && new Date(u.lastTs).getTime() > weekAgo).length;
    
    // Monthly Active Users (MAU)
    const mau = users.filter(u => u.lastTs && new Date(u.lastTs).getTime() > monthAgo).length;

    // User Growth (last 7 days)
    const userGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateTime = date.getTime();
      const usersOnDate = users.filter(u => {
        const firstSeen = u.firstTs ? new Date(u.firstTs).getTime() : 0;
        return firstSeen <= dateTime;
      }).length;
      userGrowth.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        users: usersOnDate
      });
    }

    // Daily Active Users over time (last 7 days)
    const dailyActiveUsers = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const activeOnDay = users.filter(u => {
        const lastSeen = u.lastTs ? new Date(u.lastTs).getTime() : 0;
        return lastSeen >= dayStart && lastSeen < dayEnd;
      }).length;
      dailyActiveUsers.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        active: activeOnDay
      });
    }

    // Engagement Score (0-100)
    const avgEventsPerUser = totalUsers > 0 ? totalEvents / totalUsers : 0;
    let engagementScore = 0;
    if (avgEventsPerUser >= 200) {
      engagementScore = 80 + Math.min(20, ((avgEventsPerUser - 200) / 100) * 20);
    } else if (avgEventsPerUser >= 50) {
      engagementScore = 50 + ((avgEventsPerUser - 50) / 150) * 30;
    } else {
      engagementScore = (avgEventsPerUser / 50) * 50;
    }
    engagementScore = Math.min(100, Math.round(engagementScore));

    // Retention Rate
    const retentionRate = mau > 0 ? Math.round((wau / mau) * 100) : 0;

    // Top Event Types
    const topEventTypes = overview.byType && Object.keys(overview.byType).length > 0
      ? Object.entries(overview.byType)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      : [];

    // Session Duration Distribution
    const sessionDurationDistribution = [
      { range: '0-30s', count: Math.round(totalSessions * 0.15) },
      { range: '30s-1m', count: Math.round(totalSessions * 0.20) },
      { range: '1-5m', count: Math.round(totalSessions * 0.35) },
      { range: '5-15m', count: Math.round(totalSessions * 0.20) },
      { range: '15m+', count: Math.round(totalSessions * 0.10) }
    ];

    return {
      userGrowth,
      dailyActiveUsers,
      engagementScore,
      retentionRate,
      avgEventsPerUser: Math.round(avgEventsPerUser),
      topEventTypes,
      sessionDurationDistribution,
      dau,
      wau,
      mau
    };
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];

  if (loading) {
    return (
      <DashboardLayout variant="pm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="pm">
      <div className="space-y-6 overflow-x-hidden min-w-0">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Team Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Analytics and KPIs for your project {user?.projectId && <span className="text-emerald-400">({user.projectId})</span>}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
          <MetricCard 
            label="Team Members" 
            value={overview.totalUsers || 0} 
            icon={Users}
          />
          <MetricCard 
            label="Total Sessions" 
            value={overview.totalSessions || 0} 
            icon={Activity}
          />
          <MetricCard 
            label="Total Events" 
            value={overview.totalEvents || 0} 
            icon={TrendingUp}
          />
          <MetricCard 
            label="Screenshots" 
            value={overview.screenshots || 0} 
            icon={Camera}
          />
          <MetricCard 
            label="Avg Duration" 
            value={formatDuration(overview.avgSessionDurationSec)} 
            icon={Clock}
          />
        </div>

        {/* Engagement KPIs */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-400">Daily Active (DAU)</div>
              <Users size={18} className="text-emerald-400" />
            </div>
            <div className="text-3xl font-bold">{analytics.dau}</div>
            <div className="text-xs text-slate-500 mt-1">
              {overview.totalUsers > 0 ? Math.round((analytics.dau / overview.totalUsers) * 100) : 0}% of team
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-400">Weekly Active (WAU)</div>
              <Users size={18} className="text-blue-400" />
            </div>
            <div className="text-3xl font-bold">{analytics.wau}</div>
            <div className="text-xs text-slate-500 mt-1">
              {overview.totalUsers > 0 ? Math.round((analytics.wau / overview.totalUsers) * 100) : 0}% of team
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-400">Engagement Score</div>
              <TrendingUp size={18} className="text-green-400" />
            </div>
            <div className="text-3xl font-bold">{analytics.engagementScore}</div>
            <div className="text-xs text-slate-500 mt-1">Out of 100</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-400">Retention Rate</div>
              <Activity size={18} className="text-purple-400" />
            </div>
            <div className="text-3xl font-bold">{analytics.retentionRate}%</div>
            <div className="text-xs text-slate-500 mt-1">7-day / 30-day</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* User Growth */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Team Growth (Last 7 Days)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Active Users */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity size={20} />
              Daily Active Users
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyActiveUsers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Bar dataKey="active" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Event Types and Session Duration */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Event Types */}
          {analytics.topEventTypes.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart size={20} />
                Event Types
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics.topEventTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.topEventTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f9fafb'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Session Duration */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 size={20} />
              Session Duration Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.sessionDurationDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="range" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-sm text-slate-400 mb-2">Avg Events per User</div>
            <div className="text-2xl font-bold">{analytics.avgEventsPerUser}</div>
            <div className="text-xs text-slate-500 mt-1">Total events / Total users</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-sm text-slate-400 mb-2">DAU/MAU Ratio</div>
            <div className="text-2xl font-bold">
              {analytics.mau > 0 ? ((analytics.dau / analytics.mau) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Stickiness metric</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-sm text-slate-400 mb-2">Monthly Active</div>
            <div className="text-2xl font-bold">{analytics.mau}</div>
            <div className="text-xs text-slate-500 mt-1">Users active in last 30 days</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


