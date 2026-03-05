import DashboardLayout from '../../layouts/DashboardLayout';
import MetricCard from '../../components/MetricCard';
import { useMemo } from 'react';
import { useDashboardData } from '../../lib/useData';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Area,
  AreaChart
} from 'recharts';
import { 
  Activity, 
  MousePointerClick, 
  Eye, 
  Clock, 
  Camera,
  TrendingUp,
  Users,
  Zap,
  Target,
  RefreshCw
} from 'lucide-react';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#84cc16', '#f97316'];

export default function ClientHome() {
  // Use optimized cached data hook
  const { overview, sessions, screenshots, loading, refresh } = useDashboardData();

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}m ${secs}s`;
  };

  // Process data using useMemo to avoid recalculations
  const processedData = useMemo(() => {
    const overviewMetrics = overview?.metrics || {};
    const totalDuration = (sessions || []).reduce((sum, s) => sum + (Number(s.durationSec) || 0), 0);
    const sessionCountForAvg = (sessions || []).filter(s => Number(s.durationSec) > 0).length;
    const fallbackAvgTime = sessionCountForAvg
      ? Math.round(totalDuration / sessionCountForAvg)
      : 0;
    
    const metrics = {
      totalSessions: overviewMetrics.totalSessions || 0,
      totalEvents: overviewMetrics.totalEvents || 0,
      avgTimeSec: overviewMetrics.avgTimeSec || fallbackAvgTime,
      screenshots: overviewMetrics.screenshots || (screenshots?.length || 0),
      byType: overviewMetrics.byType || {}
    };

    // Process sessions over time
    const backendSeries = overview?.charts?.sessionsOverTime || [];
    let sessionsOverTime = [];
    if (backendSeries && backendSeries.length > 0) {
      sessionsOverTime = backendSeries;
    } else {
      const byDay = {};
      (sessions || []).forEach(s => {
        const startTs = s.startTs || s.start || s.ts || Date.now();
        const day = new Date(startTs).toISOString().slice(0, 10);
        byDay[day] = (byDay[day] || 0) + 1;
      });
      sessionsOverTime = Object.entries(byDay)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
    }

    // Process event types for pie chart
    const totalEventsCount = metrics.totalEvents;
    const eventEntries = Object.entries(metrics.byType)
      .map(([type, count]) => ({
        name: type.replace('_', ' ').toUpperCase(),
        value: count,
        type
      }))
      .sort((a, b) => b.value - a.value);
    const topSlices = eventEntries.slice(0, 6);
    const topSum = topSlices.reduce((sum, item) => sum + item.value, 0);
    const otherValue = Math.max(0, totalEventsCount - topSum);
    const eventTypes = otherValue > 0
      ? [...topSlices, { name: 'OTHER', value: otherValue, type: '__other__' }]
      : topSlices;

    // Process recent sessions
    const recentSessions = (sessions || []).slice(0, 5).map(s => ({
      id: s.sessionId?.substring(0, 8) || 'Unknown',
      duration: Math.round(s.durationSec || 0),
      events: s.count || 0,
      startTime: new Date(s.start).toLocaleString(),
      userId: s.userId ? s.userId.substring(0, 8) : 'Anonymous'
    }));

    // Process top events
    const topEvents = Object.entries(metrics.byType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { metrics, sessionsOverTime, eventTypes, recentSessions, topEvents };
  }, [overview, sessions, screenshots]);

  const { metrics, sessionsOverTime, eventTypes, recentSessions, topEvents } = processedData;

  // Show loading skeleton only if no cached data
  if (loading && !overview) {
    return (
      <DashboardLayout variant="client">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="client">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-2">Dashboard Overview</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Real-time insights and analytics from your extension activity
          </p>
        </div>
        <button
          onClick={() => refresh(true)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <MetricCard
          label="Total Sessions"
          value={metrics.totalSessions}
          icon={Activity}
        />
        <MetricCard
          label="Total Events"
          value={metrics.totalEvents}
          icon={MousePointerClick}
        />
        <MetricCard
          label="Avg Session Time"
          value={metrics.avgTimeSec}
          formatter={formatDuration}
          icon={Clock}
        />
        <MetricCard
          label="Screenshots"
          value={metrics.screenshots}
          icon={Camera}
        />
      </div>

      {/* Main Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Sessions Over Time */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Sessions Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sessionsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
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
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#06b6d4" 
                  fill="#06b6d4"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Types Distribution */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target size={20} />
            Event Types
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eventTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => {
                    const denominator = metrics.totalEvents || eventTypes.reduce((sum, item) => sum + item.value, 0)
                    const pct = denominator ? ((value / denominator) * 100).toFixed(0) : '0'
                    return `${name} ${pct}%`
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {eventTypes.map((entry, index) => (
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
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Sessions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users size={20} />
            Recent Sessions
          </h3>
          <div className="space-y-3">
            {recentSessions.length > 0 ? recentSessions.map((session, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <div className="font-medium text-sm">Session {session.id}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {session.events} events • {session.duration}s
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {session.userId}
                </div>
              </div>
            )) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No recent sessions
              </div>
            )}
          </div>
        </div>

        {/* Top Events */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap size={20} />
            Top Events
          </h3>
          <div className="space-y-3">
            {topEvents.length > 0 ? topEvents.map((event, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {event.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-cyan-400">
                  {event.count}
                </span>
              </div>
            )) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No events tracked
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye size={20} />
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Sessions Today</span>
              <span className="text-sm font-medium text-cyan-400">
                {sessionsOverTime.length > 0 ? sessionsOverTime[sessionsOverTime.length - 1]?.value || 0 : 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Avg Events/Session</span>
              <span className="text-sm font-medium text-cyan-400">
                {metrics.totalSessions > 0 ? Math.round(metrics.totalEvents / metrics.totalSessions) : 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Screenshots/Session</span>
              <span className="text-sm font-medium text-cyan-400">
                {metrics.totalSessions > 0 ? (metrics.screenshots / metrics.totalSessions).toFixed(1) : 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Data Points</span>
              <span className="text-sm font-medium text-cyan-400">
                {sessionsOverTime.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
