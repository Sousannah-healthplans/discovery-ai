import DashboardLayout from '../../layouts/DashboardLayout';
import MetricCard from '../../components/MetricCard';
import { useMemo } from 'react';
import { useAnalyticsData } from '../../lib/useData';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  Activity, 
  MousePointerClick, 
  Eye, 
  Clock, 
  AlertTriangle, 
  FormInput,
  Camera,
  RefreshCw
} from 'lucide-react';

// Custom tooltip for session durations
const SessionDurationTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    const payloadItem = payload[0];
    const data = payloadItem.payload || {};
    
    let durationSeconds = Number(payloadItem.value) || 0;
    if (!durationSeconds || durationSeconds === 0) {
      durationSeconds = Number(data.duration) || 0;
    }
    
    const formatDuration = (seconds) => {
      const total = Math.max(0, Math.round(Number(seconds) || 0));
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      return `${mins}m ${secs}s`;
    };
    
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-slate-200 mb-1">
          Session: {label}
        </p>
        <p className="text-sm text-cyan-400">
          Duration: {formatDuration(durationSeconds)}
        </p>
        {data.start && (
          <p className="text-xs text-slate-400 mt-1">
            Started: {new Date(data.start).toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#84cc16', '#f97316'];

export default function ClientAnalytics() {
  // Use optimized cached data hook
  const { overview, sessions, events, loading, refresh } = useAnalyticsData();

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}m ${secs}s`;
  };

  // Process all data using useMemo
  const processedData = useMemo(() => {
    const overviewMetrics = overview?.metrics || {};
    const validSessions = (sessions || []).filter(s => Number(s.durationSec) > 0);
    const totalDuration = validSessions.reduce((sum, s) => sum + (Number(s.durationSec) || 0), 0);
    const sessionCountForAvg = validSessions.length;
    const fallbackAvgTime = sessionCountForAvg
      ? Math.round(totalDuration / sessionCountForAvg)
      : 0;
    
    const actualSessionCount = validSessions.length || overviewMetrics.totalSessions || 0;
    const metrics = {
      totalSessions: actualSessionCount,
      totalEvents: overviewMetrics.totalEvents || 0,
      avgTimeSec: overviewMetrics.avgTimeSec || fallbackAvgTime,
      screenshots: overviewMetrics.screenshots || 0,
      byType: overviewMetrics.byType || {}
    };

    // Sessions over time
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

    // Event types
    const totalEventsCount = metrics.totalEvents;
    const eventTypeData = Object.entries(metrics.byType)
      .map(([type, count]) => ({
        name: type.replace('_', ' ').toUpperCase(),
        value: count,
        type
      }))
      .sort((a, b) => b.value - a.value);
    const topSlices = eventTypeData.slice(0, 6);
    const topSum = topSlices.reduce((sum, item) => sum + item.value, 0);
    const otherValue = Math.max(0, totalEventsCount - topSum);
    const eventPieSlices = otherValue > 0
      ? [...topSlices, { name: 'OTHER', value: otherValue, type: '__other__' }]
      : topSlices;

    // Session durations
    const durationData = (sessions || [])
      .filter(s => s && (s.start || s.end))
      .map(s => {
        let durationSec = Number(s.durationSec) || 0;
        if (!durationSec && s.start && s.end) {
          durationSec = Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 1000);
        }
        const sessionId = s.sessionId || s._id || `session_${s.start || Date.now()}`;
        return {
          sessionId: sessionId.length > 8 ? sessionId.substring(0, 8) : sessionId,
          duration: Math.max(0, durationSec),
          start: s.start,
          end: s.end,
          count: s.count || 0
        };
      })
      .filter(d => d.duration >= 0)
      .sort((a, b) => {
        const aStart = a.start ? new Date(a.start).getTime() : 0;
        const bStart = b.start ? new Date(b.start).getTime() : 0;
        return aStart - bStart;
      })
      .slice(-50);

    // Hourly activity
    const hourlyMap = {};
    (events || []).forEach(event => {
      const hour = new Date(event.ts).getHours();
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    });
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      events: hourlyMap[i] || 0
    }));

    // Top pages
    const pageMap = {};
    (events || []).forEach(event => {
      let url = null;
      if (event.type === 'page_view' && event.data?.url) {
        url = event.data.url;
      } else if ((event.type === 'tab_created' || event.type === 'tab_updated') && (event.data?.url || event.url)) {
        url = event.data?.url || event.url;
      } else if (event.type === 'page_load' && (event.data?.url || event.url)) {
        url = event.data?.url || event.url;
      }
      
      if (url) {
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname || '/';
          pageMap[pathname] = (pageMap[pathname] || 0) + 1;
        } catch {
          // Invalid URL, skip
        }
      }
    });
    const topPages = Object.entries(pageMap)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Error stats
    const errors = (events || []).filter(e => e.type === 'error' || e.type === 'unhandledrejection');
    const recentErrors = errors.slice(0, 5).map(e => ({
      message: e.data?.message || 'Unknown error',
      timestamp: new Date(e.ts).toLocaleString(),
      type: e.type
    }));
    const errorStats = {
      total: errors.length,
      recent: recentErrors
    };

    return {
      metrics,
      sessionsOverTime,
      eventTypes: eventTypeData,
      eventPieSlices,
      sessionDurations: durationData,
      hourlyActivity,
      topPages,
      errorStats
    };
  }, [overview, sessions, events]);

  const {
    metrics,
    sessionsOverTime,
    eventTypes,
    eventPieSlices,
    sessionDurations,
    hourlyActivity,
    topPages,
    errorStats
  } = processedData;

  if (loading && !overview) {
    return (
      <DashboardLayout variant="client">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="client">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-2">Analytics Dashboard</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Real-time insights from extension user interactions and session data
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
            <Activity size={20} />
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
            <MousePointerClick size={20} />
            Event Types
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eventPieSlices}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => {
                    const denominator = metrics.totalEvents || eventPieSlices.reduce((sum, item) => sum + item.value, 0)
                    const pct = denominator ? ((value / denominator) * 100).toFixed(0) : '0'
                    return `${name} ${pct}%`
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {eventPieSlices.map((entry, index) => (
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

      {/* Secondary Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Hourly Activity */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} />
            Hourly Activity
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#9ca3af"
                  fontSize={12}
                  interval="preserveStartEnd"
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
                <Bar dataKey="events" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Session Durations */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} />
            Recent Session Durations
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionDurations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="sessionId" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12}
                  tickFormatter={(value) => {
                    const mins = Math.round(value / 60);
                    return mins > 0 ? `${mins}m` : `${value}s`;
                  }}
                />
                <Tooltip content={<SessionDurationTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Top Pages */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye size={20} />
            Top Pages
          </h3>
          <div className="space-y-3">
            {topPages.slice(0, 5).map((page, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                  {page.page || '/'}
                </span>
                <span className="text-sm font-medium text-cyan-400">
                  {page.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Statistics */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Error Statistics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Errors</span>
              <span className="text-sm font-medium text-red-400">
                {errorStats.total}
              </span>
            </div>
            {errorStats.recent.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-slate-500 dark:text-slate-500 mb-2">Recent Errors:</div>
                {errorStats.recent.slice(0, 3).map((error, index) => (
                  <div key={index} className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    <div className="truncate">{error.message}</div>
                    <div className="text-slate-500">{error.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Event Type Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FormInput size={20} />
            Event Breakdown
          </h3>
          <div className="space-y-3">
            {eventTypes.slice(0, 6).map((event, index) => (
              <div key={index} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">
                  {event.name}
                </span>
                <span className="text-sm font-medium text-cyan-400">
                  {event.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
