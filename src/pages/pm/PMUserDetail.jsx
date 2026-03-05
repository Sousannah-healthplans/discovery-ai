import { useParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import MetricCard from '../../components/MetricCard';
import ScreenshotGallery from '../../components/ScreenshotGallery';
import SessionTimeline from '../../components/SessionTimeline';
import { useEffect, useState } from 'react';
import { 
  Activity, 
  Clock, 
  Camera, 
  MousePointerClick,
  Search,
  Eye,
  Calendar,
  XCircle,
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
  Area,
  Legend
} from 'recharts';
import { pmFetchUsers, pmFetchUserOverview, pmFetchUserSessions, pmFetchUserEvents } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';

export default function PMUserDetail() {
  const { id } = useParams(); // id is userId (trackerUserId)
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState({ 
    totalSessions: 0, 
    avgTimeSec: 0, 
    screenshots: 0,
    totalEvents: 0
  });
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics');
  const [eventFilter, setEventFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState({
    events: [],
    screenshots: [],
    stats: { totalEvents: 0, duration: 0, pageViews: 0, interactions: 0, screenshots: 0 }
  });
  const [sessionLoading, setSessionLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    hourlyActivity: [],
    dailyActivity: [],
    eventTypes: [],
    sessionDuration: []
  });
  
  const baseUrl = BACKEND_URL;
  const token = localStorage.getItem('authToken') || '';

  useEffect(() => {
    if (!baseUrl || !token || !id) return;
    
    setLoading(true);
    Promise.all([
      pmFetchUsers(baseUrl, token).then(list => {
        const u = list.find(x => x.userId === id);
        setUser(u || { userId: id });
      }),
      pmFetchUserOverview(baseUrl, id, token).then(setOverview),
      pmFetchUserSessions(baseUrl, id, token, 500).then(setSessions),
      pmFetchUserEvents(baseUrl, id, token, undefined, 500).then(setEvents),
      pmFetchUserEvents(baseUrl, id, token, 'screenshot', 500).then(shots => {
        setScreenshots(shots || []);
      })
    ]).catch((err) => {
      console.error('Error fetching data:', err);
    }).finally(() => setLoading(false));
  }, [baseUrl, token, id]);

  // Process analytics data
  useEffect(() => {
    if (events.length === 0 && sessions.length === 0) return;

    const now = new Date();
    
    // Hourly activity
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const eventsInHour = events.filter(e => {
        const eventTime = new Date(e.ts);
        return eventTime >= hourStart && eventTime < hourEnd;
      }).length;
      
      return {
        hour: hour.getHours(),
        time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        events: eventsInHour
      };
    });

    // Daily activity
    const dailyData = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const eventsInDay = events.filter(e => {
        const eventTime = new Date(e.ts);
        return eventTime >= dayStart && eventTime < dayEnd;
      }).length;
      
      const sessionsInDay = sessions.filter(s => {
        const sessionTime = new Date(s.start);
        return sessionTime >= dayStart && sessionTime < dayEnd;
      }).length;
      
      return {
        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
        events: eventsInDay,
        sessions: sessionsInDay
      };
    });

    // Event types
    const eventTypeCounts = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    
    const totalEvents = Object.values(eventTypeCounts).reduce((sum, count) => sum + count, 0);
    const eventTypes = Object.entries(eventTypeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalEvents ? ((count / totalEvents) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.count - a.count);

    // Session duration distribution
    const durationRanges = [
      { range: '0-30s', min: 0, max: 30, count: 0 },
      { range: '30s-1m', min: 30, max: 60, count: 0 },
      { range: '1-5m', min: 60, max: 300, count: 0 },
      { range: '5-15m', min: 300, max: 900, count: 0 },
      { range: '15m+', min: 900, max: Infinity, count: 0 }
    ];
    
    sessions.forEach(session => {
      const duration = session.durationSec || 0;
      const range = durationRanges.find(r => duration >= r.min && duration < r.max);
      if (range) range.count++;
    });

    setAnalyticsData({
      hourlyActivity: hourlyData,
      dailyActivity: dailyData,
      eventTypes,
      sessionDuration: durationRanges
    });
  }, [events, sessions]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleViewSession = async (sessionId) => {
    setSelectedSession(sessionId);
    setSessionLoading(true);
    
    try {
      const sessionEvents = events.filter(e => e.sessionId === sessionId && e.type !== 'screenshot');
      const sessionShots = screenshots.filter(s => s.sessionId === sessionId);
      
      const timeline = sessionEvents.map(e => {
        let label = '';
        if (e.data) {
          const el = e.data.element;
          if (el) {
            label = el.ariaLabel || el.name || el.placeholder || el.id || el.text || '';
            if (!label && el.tag) label = `<${el.tag}>`;
          }
          if (!label) {
            label = e.data.selector || e.data.path || e.data.label || e.data.title || e.data.url || '';
          }
        }
        return {
          id: String(e._id || `${e.sessionId}_${e.ts}`),
          type: e.type,
          label,
          ts: new Date(e.ts).toISOString(),
          data: e.data
        };
      });

      const shots = sessionShots.map((s, idx) => {
        const eventData = s.data || {};
        let screenshotUrl = '';
        
        if (eventData.cloudinaryUrl) {
          screenshotUrl = eventData.cloudinaryUrl;
        } else if (eventData.screenshotFilename) {
          screenshotUrl = `${baseUrl.replace(/\/$/, '')}/screenshots/${eventData.screenshotFilename}`;
        } else if (eventData.dataUrl) {
          screenshotUrl = eventData.dataUrl;
        }
        
        return {
          id: `${s._id || s.sessionId}_${idx}`,
          url: screenshotUrl,
          timestamp: new Date(s.ts).toISOString()
        };
      }).filter(shot => shot.url);

      const timeValues = sessionEvents.map(e => new Date(e.ts).getTime()).filter(v => Number.isFinite(v));
      const stats = {
        totalEvents: timeline.length,
        duration: timeValues.length > 0 ? Math.round((Math.max(...timeValues) - Math.min(...timeValues)) / 1000) : 0,
        pageViews: timeline.filter(e => ['page_view', 'pageview', 'route_change'].includes(e.type)).length,
        interactions: timeline.filter(e => ['click', 'input', 'form_submit'].includes(e.type)).length,
        screenshots: shots.length
      };

      setSessionDetails({ events: timeline, screenshots: shots, stats });
    } catch (error) {
      console.error('Error fetching session details:', error);
    } finally {
      setSessionLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = !eventFilter || 
      event.sessionId?.toLowerCase().includes(eventFilter.toLowerCase()) ||
      event.type?.toLowerCase().includes(eventFilter.toLowerCase());
    const matchesType = !eventTypeFilter || event.type === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  const eventTypes = [...new Set(events.map(e => e.type))].filter(Boolean);

  const sessionColumns = [
    { key: 'sessionId', header: 'Session ID', render: v => v?.slice(0, 12) + '...' },
    { key: 'eventCount', header: 'Events' },
    { key: 'startTime', header: 'Start Time' },
    { key: 'duration', header: 'Duration' },
    { key: 'actions', header: 'Actions', render: (v, r) => (
      <button
        onClick={() => handleViewSession(r.sessionId)}
        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
      >
        <Eye size={14} className="inline mr-1" />
        View
      </button>
    )},
  ];

  if (loading) {
    return (
      <DashboardLayout variant="pm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading user details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="pm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {user?.name || user?.username || `User ${id?.slice(0, 12)}`}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {user?.email && <span>{user.email} • </span>}
          User ID: {id}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <MetricCard label="Total Sessions" value={overview.totalSessions} icon={Activity} />
        <MetricCard label="Avg Duration" value={formatDuration(overview.avgTimeSec)} icon={Clock} />
        <MetricCard label="Screenshots" value={overview.screenshots} icon={Camera} />
        <MetricCard label="Total Events" value={overview.totalEvents || events.length} icon={MousePointerClick} />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          {[
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'sessions', label: 'Sessions', icon: Activity },
            { id: 'events', label: 'Events', icon: MousePointerClick },
            { id: 'screenshots', label: 'Screenshots', icon: Camera }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hourly Activity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock size={20} />
                Hourly Activity (Last 24h)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
                    <Area type="monotone" dataKey="events" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Activity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Daily Activity (Last 7 days)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
                    <Legend />
                    <Bar dataKey="events" fill="#10b981" name="Events" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Event Types */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart size={20} />
                Event Types
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.eventTypes.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type} (${percentage}%)`}
                      outerRadius={80}
                      dataKey="count"
                    >
                      {analyticsData.eventTypes.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'][index % 8]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Session Duration */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Session Duration Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.sessionDuration}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="range" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Sessions ({sessions.length})
          </h3>
          <DataTable 
            rows={sessions.map(s => ({
              id: s.sessionId,
              sessionId: s.sessionId,
              eventCount: s.count || 0,
              startTime: formatDate(s.start),
              duration: formatDuration(s.durationSec || 0)
            }))} 
            columns={sessionColumns} 
            searchKeys={["sessionId", "startTime"]} 
          />
        </div>
      )}

      {/* Screenshots Tab */}
      {activeTab === 'screenshots' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Camera size={20} />
            Screenshots ({screenshots.length})
          </h3>
          {screenshots.length > 0 ? (
            <ScreenshotGallery 
              screenshots={screenshots.map((s, idx) => {
                const eventData = s.data || {};
                let url = eventData.cloudinaryUrl || eventData.dataUrl || '';
                if (eventData.screenshotFilename) {
                  url = `${baseUrl.replace(/\/$/, '')}/screenshots/${eventData.screenshotFilename}`;
                }
                return {
                  id: `${s._id}_${idx}`,
                  url,
                  timestamp: new Date(s.ts).toISOString(),
                  ocrText: s.ocrText,
                  ocrTags: s.ocrTags
                };
              }).filter(s => s.url)}
              showSearch={true}
            />
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <p>No screenshots available</p>
            </div>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MousePointerClick size={20} />
              Events ({filteredEvents.length})
            </h3>
            <div className="flex gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                />
              </div>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
              >
                <option value="">All Types</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredEvents.slice(0, 100).map(event => (
              <div key={event._id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded">
                    {event.type}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(event.ts)}</span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Session: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">{event.sessionId?.slice(0, 12)}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold">Session Details</h2>
                <p className="text-slate-400 text-sm">ID: {selectedSession}</p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <XCircle size={24} className="text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
              {sessionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <MetricCard label="Events" value={sessionDetails.stats.totalEvents} icon={Activity} />
                    <MetricCard label="Duration" value={formatDuration(sessionDetails.stats.duration)} icon={Clock} />
                    <MetricCard label="Page Views" value={sessionDetails.stats.pageViews} icon={Eye} />
                    <MetricCard label="Interactions" value={sessionDetails.stats.interactions} icon={MousePointerClick} />
                    <MetricCard label="Screenshots" value={sessionDetails.stats.screenshots} icon={Camera} />
                  </div>
                  
                  {sessionDetails.events.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                      <SessionTimeline actions={sessionDetails.events} />
                    </div>
                  )}
                  
                  {sessionDetails.screenshots.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Screenshots ({sessionDetails.screenshots.length})</h3>
                      <ScreenshotGallery screenshots={sessionDetails.screenshots} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}


